import { HydratedDocument, Model, Schema, model, models } from "mongoose";

/* =========================
   Types
========================= */

export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: Date;
  time: string; // HH:MM (24h, normalised)
  venueType: "inside" | "outside";
  minRating: number;
  maxRating: number;
  maxParticipants: number;
  duration: number; // minutes
  organizer: string;
  tags: string[];
  bookingsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

type EventModel = Model<IEvent>;

/* =========================
   Helpers
========================= */

function requireTrimmedString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

/** Replace Danish letters: æ→ae, ø→oe, å→aa (case-aware for titles). */
function replaceDanishLetters(value: string): string {
  return value
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .replace(/ø/g, "oe")
    .replace(/Ø/g, "Oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "Aa");
}

function createSlug(title: string): string {
  return replaceDanishLetters(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTime(value: string): string {
  const v = value.trim();

  const match24 = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    return `${match24[1].padStart(2, "0")}:${match24[2]}`;
  }

  const match12 = v.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (!match12) {
    throw new Error("Invalid time format. Use HH:MM or HH:MM AM/PM.");
  }

  let hours = parseInt(match12[1], 10);
  const minutes = match12[2];
  const period = match12[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

/* =========================
   Schema
========================= */

const eventSchema = new Schema<IEvent, EventModel>(
  {
    title: {
      type: String,
      required: [true, "title is required."],
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "description is required."],
      trim: true,
    },

    overview: {
      type: String,
      required: [true, "overview is required."],
      trim: true,
    },

    image: {
      type: String,
      required: [true, "image is required."],
      trim: true,
    },

    venue: {
      type: String,
      required: [true, "venue is required."],
      trim: true,
    },

    location: {
      type: String,
      required: [true, "location is required."],
      trim: true,
    },

    date: {
      type: Date,
      required: [true, "date is required."],
    },

    time: {
      type: String,
      required: [true, "time is required."],
      trim: true,
    },

    venueType: {
      type: String,
      required: [true, "venueType is required."],
      enum: {
        values: ["inside", "outside"],
        message: "venueType must be 'inside' or 'outside'.",
      },
    },

    minRating: {
      type: Number,
      required: [true, "minRating is required."],
      min: [0, "minRating must be at least 0."],
      max: [4, "minRating must be at most 4."],
    },

    maxRating: {
      type: Number,
      required: [true, "maxRating is required."],
      min: [1, "maxRating must be at least 1."],
      max: [5, "maxRating must be at most 5."],
    },

    maxParticipants: {
      type: Number,
      required: [true, "maxParticipants is required."],
      min: [1, "maxParticipants must be at least 1."],
    },

    bookingsCount: {
      type: Number,
      default: 0,
      min: [0, "bookingsCount must be at least 0."],
    },

    duration: {
      type: Number,
      required: [true, "duration is required."],
      min: [60, "duration must be at least 60 minutes."],
    },

    organizer: {
      type: String,
      required: [true, "organizer is required."],
      trim: true,
    },

    tags: {
      type: [String],
      required: [true, "tags is required."],
      validate: {
        validator: (arr: string[]) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((t) => typeof t === "string" && t.trim().length > 0),
        message: "tags must be a non-empty array of non-empty strings.",
      },
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

/* =========================
   Indexes
========================= */

eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ date: 1, location: 1 });
eventSchema.index({ venueType: 1, date: 1 });

/* =========================
   Pre-save hook
========================= */

eventSchema.pre("save", async function () {
  const doc = this as HydratedDocument<IEvent>;

  // Sanitise and normalise fields
  doc.title = replaceDanishLetters(requireTrimmedString(doc.title, "title"));
  doc.description = requireTrimmedString(doc.description, "description");
  doc.overview = requireTrimmedString(doc.overview, "overview");
  doc.image = requireTrimmedString(doc.image, "image");
  doc.venue = requireTrimmedString(doc.venue, "venue");
  doc.location = requireTrimmedString(doc.location, "location");
  doc.organizer = requireTrimmedString(doc.organizer, "organizer");
  doc.time = normalizeTime(requireTrimmedString(doc.time, "time"));
  doc.tags = doc.tags.map((t) => requireTrimmedString(t, "tag"));

  // Cross-field validation
  if (doc.minRating > doc.maxRating) {
    throw new Error("minRating cannot be greater than maxRating.");
  }

  // Slug: generate on creation or when title changes
  if (doc.isModified("title") || !doc.slug) {
    const baseSlug = createSlug(doc.title);
    let slug = baseSlug;
    let counter = 1;

    while (
      await (doc.constructor as EventModel).exists({
        slug,
        _id: { $ne: doc._id },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    doc.slug = slug;
  }
});

/* =========================
   Model export
========================= */

// In development, drop the cached model so schema/hook edits apply after HMR.
// Without this, mongoose keeps the first-compiled pre-save hooks (e.g. slug logic).
if (process.env.NODE_ENV !== "production" && models.Event) {
  delete models.Event;
}

export const Event =
  (models.Event as EventModel | undefined) ??
  model<IEvent, EventModel>("Event", eventSchema);
