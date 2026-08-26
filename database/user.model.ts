import { HydratedDocument, Model, Schema, model, models } from "mongoose";

/* =========================
   Types
========================= */

export interface IUser {
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

type UserModel = Model<IUser>;

/* =========================
   Schema
========================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema<IUser, UserModel>(
  {
    firebaseUid: {
      type: String,
      required: [true, "firebaseUid is required."],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "email is required."],
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => EMAIL_PATTERN.test(value),
        message: "email must be a valid email address.",
      },
    },

    firstName: {
      type: String,
      required: [true, "firstName is required."],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "lastName is required."],
      trim: true,
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

userSchema.index({ firebaseUid: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

/* =========================
   Pre-save hook
========================= */

userSchema.pre("save", function (this: HydratedDocument<IUser>) {
  if (!this.firebaseUid.trim()) {
    throw new Error("firebaseUid is required.");
  }

  if (!EMAIL_PATTERN.test(this.email)) {
    throw new Error("email must be a valid email address.");
  }

  if (!this.firstName.trim()) {
    throw new Error("firstName is required.");
  }

  if (!this.lastName.trim()) {
    throw new Error("lastName is required.");
  }
});

/* =========================
   Model export
========================= */

// In development, drop the cached model so schema/hook edits apply after HMR.
if (process.env.NODE_ENV !== "production" && models.User) {
  delete models.User;
}

export const User =
  (models.User as UserModel | undefined) ??
  model<IUser, UserModel>("User", userSchema);
