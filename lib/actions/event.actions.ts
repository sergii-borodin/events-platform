import connectDB from "@/lib/mongodb";
import { Event, type IEvent } from "@/database/event.model";
import { Booking } from "@/database/booking.model";
import { DEFAULT_RADIUS_KM, type EventQuery } from "@/lib/utils/eventFilter";
import { distanceKm, geocodeLocation, type Coordinates } from "@/lib/utils/geo";

type EventWithBookings = IEvent & { _id: string };

const bookingsLookupStages = [
  {
    $lookup: {
      from: Booking.collection.name,
      localField: "_id",
      foreignField: "eventId",
      as: "bookings",
    },
  },
  {
    $addFields: {
      bookingsCount: { $size: "$bookings" },
    },
  },
  {
    $project: {
      bookings: 0,
    },
  },
] as const;

function serializeEvent<T extends { _id: unknown }>(
  event: T,
): Omit<T, "_id"> & { _id: string } {
  return {
    ...event,
    _id: String(event._id),
  };
}

async function filterEventsByRadius(
  events: (IEvent & { _id: unknown })[],
  origin: Coordinates,
  radiusKm: number,
): Promise<(IEvent & { _id: unknown })[]> {
  const uniqueLocations = [...new Set(events.map((event) => event.location))];
  const coordinatesByLocation = new Map<string, Coordinates | null>(
    await Promise.all(
      uniqueLocations.map(
        async (location) =>
          [location, await geocodeLocation(location)] as const,
      ),
    ),
  );

  return events.filter((event) => {
    const coordinates = coordinatesByLocation.get(event.location);
    if (!coordinates) return false;
    return distanceKm(origin, coordinates) <= radiusKm;
  });
}

export const getEvents = async (
  query: EventQuery = {
    category: "all",
    zip: "",
    radiusKm: DEFAULT_RADIUS_KM,
    lat: null,
    lng: null,
  },
): Promise<EventWithBookings[]> => {
  try {
    await connectDB();

    const match =
      query.rangeStart && query.rangeEnd
        ? {
            date: {
              $gte: new Date(query.rangeStart),
              $lt: new Date(query.rangeEnd),
            },
          }
        : null;

    const events = await Event.aggregate<IEvent & { _id: unknown }>([
      ...(match ? [{ $match: match }] : []),
      ...bookingsLookupStages,
      { $sort: { date: 1, time: 1 } },
    ]);

    if (query.category !== "local") {
      return events.map(serializeEvent);
    }

    if (query.lat == null || query.lng == null) {
      return [];
    }

    const nearby = await filterEventsByRadius(
      events,
      { lat: query.lat, lng: query.lng },
      query.radiusKm,
    );

    return nearby.map(serializeEvent);
  } catch {
    return [];
  }
};

export const getEventBySlug = async (
  slug: string,
): Promise<EventWithBookings | null> => {
  try {
    await connectDB();

    const [event] = await Event.aggregate<IEvent & { _id: unknown }>([
      { $match: { slug } },
      ...bookingsLookupStages,
      { $limit: 1 },
    ]);

    return event ? serializeEvent(event) : null;
  } catch {
    return null;
  }
};

export const getSimilarEventBySlug = async (slug: string) => {
  try {
    await connectDB();
    const event = await Event.findOne({ slug }).lean<
      IEvent & { _id: string }
    >();

    if (!event) {
      return [];
    }

    const similar = await Event.aggregate<IEvent & { _id: unknown }>([
      {
        $match: {
          _id: { $ne: event._id },
          tags: { $in: event.tags },
          minRating: { $lte: event.maxRating },
          maxRating: { $gte: event.minRating },
        },
      },
      ...bookingsLookupStages,
    ]);

    return similar.map(serializeEvent);
  } catch {
    return [];
  }
};
