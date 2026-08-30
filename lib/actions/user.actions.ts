"use server";

import { User } from "@/database";
import connectDB from "@/lib/mongodb";

export type UpsertUserFromFirebaseInput = {
  firebaseUid: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type UpsertedUser = {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type UpsertUserResult =
  | { status: "created" | "updated"; user: UpsertedUser }
  | { status: "skipped" }
  | { status: "error" };

type UserLean = {
  _id: unknown;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
};

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11000;

function serializeUser(user: UserLean): UpsertedUser {
  return {
    id: String(user._id),
    firebaseUid: user.firebaseUid,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export const upsertUserFromFirebase = async ({
  firebaseUid,
  email,
  firstName,
  lastName,
}: UpsertUserFromFirebaseInput): Promise<UpsertUserResult> => {
  const normalizedUid = firebaseUid.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFirstName = firstName?.trim() ?? "";
  const normalizedLastName = lastName?.trim() ?? "";

  if (!normalizedUid || !normalizedEmail) {
    return { status: "error" };
  }

  try {
    await connectDB();

    const existing = await User.findOne({ firebaseUid: normalizedUid }).lean<
      UserLean | null
    >();

    if (existing) {
      if (existing.email !== normalizedEmail) {
        await User.updateOne(
          { firebaseUid: normalizedUid },
          { $set: { email: normalizedEmail } },
        );
      }

      return {
        status: "updated",
        user: serializeUser({ ...existing, email: normalizedEmail }),
      };
    }

    if (!normalizedFirstName || !normalizedLastName) {
      return { status: "skipped" };
    }

    try {
      const created = await User.create({
        firebaseUid: normalizedUid,
        email: normalizedEmail,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });

      return {
        status: "created",
        user: serializeUser(created),
      };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const raced = await User.findOne({
        firebaseUid: normalizedUid,
      }).lean<UserLean | null>();

      if (!raced) {
        return { status: "error" };
      }

      return {
        status: "updated",
        user: serializeUser(raced),
      };
    }
  } catch (error) {
    console.error("upsert user from firebase failed", error);
    return { status: "error" };
  }
};
