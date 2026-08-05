import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import BookEvent from "@/app/components/BookEvent";
import SimilarEventCard from "@/app/components/SimilarEventCard";
import {
  getEventBySlug,
  getSimilarEventBySlug,
} from "@/lib/actions/event.actions";
import { IEvent } from "@/database/event.model";

const EventDetailItem = ({
  icon,
  alt,
  label,
}: {
  icon: string;
  alt: string;
  label: string;
}) => (
  <div className="flex-row-gap-2 items-center">
    <Image src={icon} alt={alt} width={17} height={17} />
    <p>{label}</p>
  </div>
);

const formatEventDate = (date: string | Date): string => {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatVenueType = (venueType: string): string =>
  venueType.charAt(0).toUpperCase() + venueType.slice(1);

const getGameTimeRange = (
  startTime: string,
  durationMinutes: number,
): string => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);

  const totalStartMinutes = startHours * 60 + startMinutes;
  const totalEndMinutes = totalStartMinutes + durationMinutes;

  const endHours = Math.floor(totalEndMinutes / 60);
  const endMinutes = totalEndMinutes % 60;

  const pad = (n: number): string => String(n).padStart(2, "0");

  return `${startTime} – ${pad(endHours)}:${pad(endMinutes)}`;
};

function EventDetailsSkeleton() {
  return (
    <section id="event" aria-busy="true" aria-label="Loading event">
      <div className="header">
        <h1 className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
        <p className="mt-2 h-4 w-full animate-pulse rounded bg-white/10" />
      </div>
    </section>
  );
}

const EventDetailsPage = ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => (
  <Suspense fallback={<EventDetailsSkeleton />}>
    <EventDetailsContent params={params} />
  </Suspense>
);

async function EventDetailsContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  "use cache";
  cacheLife("minutes");

  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event?.description) return notFound();

  const {
    _id,
    title,
    description,
    overview,
    image,
    venue,
    location,
    date,
    time,
    venueType,
    minRating,
    maxRating,
    maxParticipants,
    bookingsCount = 0,
    organizer,
    tags,
    duration,
  } = event;

  const bookings = bookingsCount;
  const similarEvents: IEvent[] = await getSimilarEventBySlug(slug);

  return (
    <>
      <section id="event">
        <div className="header">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="details">
          <div className="content">
            <Image
              src={image}
              alt={title}
              width={1200}
              height={457}
              className="banner"
              priority
            />

            <section className="flex-col-gap-2">
              <h2>Overview</h2>
              <p>{overview}</p>
            </section>

            {tags.length > 0 && (
              <section className="flex-col-gap-2">
                <h2>Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span key={tag} className="pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="flex-col-gap-2">
              <h2>Event Details</h2>
              <EventDetailItem
                icon="/icons/calendar.svg"
                alt="calendar"
                label={formatEventDate(date)}
              />
              <EventDetailItem
                icon="/icons/clock.svg"
                alt="clock"
                label={getGameTimeRange(time, Number(duration))}
              />
              <EventDetailItem
                icon="/icons/pin.svg"
                alt="pin"
                label={location}
              />
              <EventDetailItem
                icon="/icons/mode.svg"
                alt="venue"
                label={`${formatVenueType(venueType)} · ${venue}`}
              />
              <EventDetailItem
                icon="/icons/audience.svg"
                alt="participants"
                label={`${bookings} / ${maxParticipants} participants`}
              />
              <p>
                Expected players rating: {minRating}–{maxRating}
              </p>
            </section>

            <section className="flex-col-gap-2">
              <h2>Organizer</h2>
              <p>{organizer}</p>
            </section>
          </div>

          <aside className="booking">
            <div className="signup-card">
              <h2 className="text-lg font-semibold">Book Your Spot</h2>
              <p className="text-light-200 text-sm">{title}</p>
              <p className="text-light-200 text-sm">
                {formatVenueType(venueType)} · {venue}
              </p>
              {bookings < maxParticipants ? (
                <>
                  {bookings > 0 ? (
                    <p className="text-sm">
                      Join {bookings} people who have already booked their spot!
                    </p>
                  ) : (
                    <p className="text-sm">Be the first to book your spot!</p>
                  )}
                  <BookEvent eventId={_id} slug={slug} />
                </>
              ) : (
                <p className="text-red-500">No available spots left</p>
              )}
            </div>
          </aside>
        </div>
      </section>
      {similarEvents.length > 0 && (
        <section
          className="similar-events"
          aria-labelledby="similar-events-heading">
          <div className="similar-events-header">
            <h2 id="similar-events-heading">Similar Events</h2>
            <p>Other events you might enjoy based on tags and skill level</p>
          </div>
          <ul className="similar-events-list">
            {similarEvents.map((event) => (
              <li key={event.slug}>
                <SimilarEventCard
                  title={event.title}
                  image={event.image}
                  slug={event.slug}
                  location={event.location}
                  date={new Date(event.date)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default EventDetailsPage;
