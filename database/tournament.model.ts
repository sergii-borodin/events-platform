import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from "mongoose";

/* =========================
   Types
========================= */

export type TournamentStatus = "setup" | "playing" | "finished";
export type TournamentType = "americano" | "mexicano";
export type StartMode = "custom" | "random";
export type PointsTo = 11 | 16 | 21 | 24 | 32;
export type ResultSorting = "pointsFirst" | "winsFirst";
export type FeedbackTone =
  | "formal"
  | "neutral"
  | "teambuilding"
  | "punchy"
  | "roast";

export interface ITournamentCourt {
  id: string;
  name: string;
}

export interface ITournamentPlayer {
  id: string;
  name: string;
  bookingId?: string;
  firstName?: string;
  lastName?: string;
  fieldName?: string;
}

export interface ILineupFieldSlot {
  firstName: string;
  lastName: string;
  bookingId?: string;
}

export interface ILineupFieldSnapshot {
  name: string;
  slots: ILineupFieldSlot[];
}

export interface ITournamentTeam {
  playerIds: string[];
  score: number | null;
}

export interface ITournamentMatch {
  id: string;
  courtId: string;
  teamA: ITournamentTeam;
  teamB: ITournamentTeam;
}

export interface ITournamentRound {
  index: number;
  isFinal: boolean;
  matches: ITournamentMatch[];
  restingPlayerIds: string[];
}

export interface IPlayerRecap {
  playerId: string;
  text: string;
  generatedAt: Date;
}

export interface ITournament {
  eventId: Types.ObjectId;
  slug: string;
  status: TournamentStatus;
  tournamentType: TournamentType;
  startMode: StartMode;
  pointsTo: PointsTo;
  resultSorting: ResultSorting;
  courts: ITournamentCourt[];
  players: ITournamentPlayer[];
  lineupFields: ILineupFieldSnapshot[];
  rounds: ITournamentRound[];
  currentRoundIndex: number;
  feedbackTone?: FeedbackTone | null;
  playerRecaps: IPlayerRecap[];
  createdAt: Date;
  updatedAt: Date;
}

type TournamentModel = Model<ITournament>;

const POINTS_TO_VALUES: PointsTo[] = [11, 16, 21, 24, 32];
const FEEDBACK_TONE_VALUES: FeedbackTone[] = [
  "formal",
  "neutral",
  "teambuilding",
  "punchy",
  "roast",
];

/* =========================
   Schema
========================= */

const courtSchema = new Schema<ITournamentCourt>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const playerSchema = new Schema<ITournamentPlayer>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    bookingId: { type: String, required: false },
    firstName: { type: String, required: false, trim: true },
    lastName: { type: String, required: false, trim: true },
    fieldName: { type: String, required: false, trim: true },
  },
  { _id: false },
);

const lineupFieldSlotSchema = new Schema<ILineupFieldSlot>(
  {
    firstName: { type: String, required: false, trim: true, default: "" },
    lastName: { type: String, required: false, trim: true, default: "" },
    bookingId: { type: String, required: false },
  },
  { _id: false },
);

const lineupFieldSnapshotSchema = new Schema<ILineupFieldSnapshot>(
  {
    name: { type: String, required: false, trim: true, default: "" },
    slots: { type: [lineupFieldSlotSchema], default: [] },
  },
  { _id: false },
);

const teamSchema = new Schema<ITournamentTeam>(
  {
    playerIds: {
      type: [String],
      required: true,
      validate: {
        validator: (ids: string[]) =>
          Array.isArray(ids) && ids.length >= 1 && ids.length <= 2,
        message: "team must have 1 or 2 player ids.",
      },
    },
    score: {
      type: Number,
      default: null,
      min: [0, "score must be at least 0."],
    },
  },
  { _id: false },
);

const matchSchema = new Schema<ITournamentMatch>(
  {
    id: { type: String, required: true },
    courtId: { type: String, required: true },
    teamA: { type: teamSchema, required: true },
    teamB: { type: teamSchema, required: true },
  },
  { _id: false },
);

const roundSchema = new Schema<ITournamentRound>(
  {
    index: { type: Number, required: true, min: 0 },
    isFinal: { type: Boolean, default: false },
    matches: { type: [matchSchema], default: [] },
    restingPlayerIds: { type: [String], default: [] },
  },
  { _id: false },
);

const playerRecapSchema = new Schema<IPlayerRecap>(
  {
    playerId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tournamentSchema = new Schema<ITournament, TournamentModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "eventId is required."],
      index: true,
    },

    slug: {
      type: String,
      required: [true, "slug is required."],
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["setup", "playing", "finished"],
      default: "setup",
      required: true,
    },

    tournamentType: {
      type: String,
      enum: ["americano", "mexicano"],
      default: "americano",
      required: true,
    },

    startMode: {
      type: String,
      enum: ["custom", "random"],
      default: "custom",
      required: false,
    },

    pointsTo: {
      type: Number,
      enum: {
        values: POINTS_TO_VALUES,
        message: "pointsTo must be 11, 16, 21, 24, or 32.",
      },
      default: 16,
      required: true,
    },

    resultSorting: {
      type: String,
      enum: ["pointsFirst", "winsFirst"],
      default: "pointsFirst",
      required: true,
    },

    courts: {
      type: [courtSchema],
      default: () => [{ id: "court-1", name: "Court 1" }],
      validate: {
        validator: (courts: ITournamentCourt[]) =>
          Array.isArray(courts) && courts.length >= 1,
        message: "at least one court is required.",
      },
    },

    players: {
      type: [playerSchema],
      default: [],
    },

    lineupFields: {
      type: [lineupFieldSnapshotSchema],
      default: [],
    },

    rounds: {
      type: [roundSchema],
      default: [],
    },

    currentRoundIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    feedbackTone: {
      type: String,
      enum: FEEDBACK_TONE_VALUES,
      required: false,
    },

    playerRecaps: {
      type: [playerRecapSchema],
      default: [],
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

// One active tournament document per event
tournamentSchema.index({ eventId: 1 }, { unique: true });
tournamentSchema.index({ slug: 1 }, { unique: true });

/* =========================
   Model export
========================= */

if (process.env.NODE_ENV !== "production" && models.Tournament) {
  delete models.Tournament;
}

export const Tournament =
  (models.Tournament as TournamentModel | undefined) ??
  model<ITournament, TournamentModel>("Tournament", tournamentSchema);

export type TournamentDocument = HydratedDocument<ITournament>;
