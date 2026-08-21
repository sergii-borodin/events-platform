import { Suspense } from "react";
import { cacheLife } from "next/cache";

import EventCard from "../components/EventCard";
import CreateEventBtn from "../components/CreateEventBtn";
import EventFilter, { EventFilterFallback } from "../components/EventFilter";
import type { IEvent } from "@/database/event.model";
import { getEvents } from "@/lib/actions/event.actions";
import {
  emptyEventsMessage,
  isCompletePostcode,
  parseEventFilter,
  toEventQuery,
  type EventQuery,
} from "@/lib/utils/eventFilter";
import { geocodePostcode } from "@/lib/utils/geo";

type EventsPageProps = {
  searchParams: Promise<{
    filter?: string | string[];
    zip?: string | string[];
    radius?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
  }>;
};

const EventsPage = ({ searchParams }: EventsPageProps) => (
  <section className="relative">
    <CreateEventBtn />
    <div className="mt-10 space-y-7 sm:mt-20">
      <div className="events-toolbar">
        <h3>Explore and book a game you like</h3>
        <Suspense fallback={<EventFilterFallback />}>
          <EventFilter />
        </Suspense>
      </div>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsList searchParams={searchParams} />
      </Suspense>
    </div>
  </section>
);

async function EventsList({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const query = toEventQuery(parseEventFilter(params));

  if (query.category !== "local") {
    return <CachedEventsList query={query} />;
  }

  let lat = query.lat;
  let lng = query.lng;

  if (lat == null || lng == null) {
    if (!isCompletePostcode(query.zip)) {
      return (
        <p>Enter a postcode or detect your location to see events nearby.</p>
      );
    }

    const origin = await geocodePostcode(query.zip);
    if (!origin) {
      return (
        <p>
          We couldn&apos;t find that postcode. Try another, or detect your
          location.
        </p>
      );
    }

    lat = origin.lat;
    lng = origin.lng;
  }

  return <CachedEventsList query={{ ...query, lat, lng }} />;
}

async function CachedEventsList({ query }: { query: EventQuery }) {
  "use cache";
  cacheLife("minutes");

  const events: IEvent[] = await getEvents(query);

  if (events.length === 0) {
    return <p>{emptyEventsMessage(query)}</p>;
  }

  return (
    <ul className="events">
      {events.map((event: IEvent) => (
        <li key={event.slug}>
          <EventCard
            title={event.title}
            image={event.image}
            slug={event.slug}
            location={event.location}
            date={event.date}
            time={event.time}
            venueType={event.venueType}
            minRating={event.minRating}
            maxRating={event.maxRating}
            bookingsCount={event.bookingsCount ?? 0}
            maxParticipants={event.maxParticipants}
            duration={event.duration}
          />
        </li>
      ))}
    </ul>
  );
}

function EventsGridSkeleton() {
  return (
    <ul className="events" aria-busy="true" aria-label="Loading events">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="events-skeleton-card" />
      ))}
    </ul>
  );
}

export default EventsPage;
