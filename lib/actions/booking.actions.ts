"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";

import { Booking, Event } from "@/database";
import connectDB from "@/lib/mongodb";

type CreateBookingResult =
  | { success: true }
  | {
      success: false;
      reason:
        | "duplicate"
        | "event-not-found"
        | "full"
        | "invalid-event"
        | "error";
    };

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11000;

export type EventParticipant = {
  id: string;
  firstName: string;
  lastName: string;
};

export const getEventParticipants = async (
  eventId: string,
): Promise<EventParticipant[]> => {
  if (!Types.ObjectId.isValid(eventId)) {
    return [];
  }

  try {
    await connectDB();

    const bookings = await Booking.find({ eventId: new Types.ObjectId(eventId) })
      .select("firstName lastName")
      .sort({ createdAt: 1 })
      .lean<Array<{ _id: unknown; firstName?: string; lastName?: string }>>();

    return bookings.map((booking) => ({
      id: String(booking._id),
      firstName: booking.firstName?.trim() ?? "",
      lastName: booking.lastName?.trim() ?? "",
    }));
  } catch (e) {
    console.error("get event participants failed", e);
    return [];
  }
};

export const createBooking = async ({
  eventId,
  firstName,
  lastName,
  email,
  slug,
}: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  slug: string;
}): Promise<CreateBookingResult> => {
  if (!Types.ObjectId.isValid(eventId)) {
    return { success: false, reason: "invalid-event" };
  }

  const eventObjectId = new Types.ObjectId(eventId);
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedFirstName || !normalizedLastName) {
    return { success: false, reason: "error" };
  }

  try {
    const db = await connectDB();
    const session = await db.startSession();

    let result: CreateBookingResult = { success: false, reason: "error" };

    try {
      await session.withTransaction(async () => {
        const event = await Event.findById(eventObjectId)
          .select("maxParticipants")
          .session(session);

        if (!event) {
          result = { success: false, reason: "event-not-found" };
          return;
        }

        const existingBooking = await Booking.exists({
          eventId: eventObjectId,
          email: normalizedEmail,
        }).session(session);

        if (existingBooking) {
          result = { success: false, reason: "duplicate" };
          return;
        }

        const bookingsCount = await Booking.countDocuments({
          eventId: eventObjectId,
        }).session(session);

        if (bookingsCount >= event.maxParticipants) {
          result = { success: false, reason: "full" };
          return;
        }

        await Event.updateOne(
          { _id: eventObjectId },
          { $set: { bookingsCount: bookingsCount + 1 } },
          { session },
        );

        await Booking.create(
          [
            {
              eventId: eventObjectId,
              firstName: normalizedFirstName,
              lastName: normalizedLastName,
              email: normalizedEmail,
            },
          ],
          { session },
        );

        result = { success: true };

        if (result.success) {
          revalidatePath(`/events/${slug}`);
          revalidatePath("/events");
        }
      });
    } finally {
      await session.endSession();
    }

    return result;
  } catch (e) {
    console.error("create booking failed", e);

    if (isDuplicateKeyError(e)) {
      return { success: false, reason: "duplicate" };
    }

    return { success: false, reason: "error" };
  }
};
