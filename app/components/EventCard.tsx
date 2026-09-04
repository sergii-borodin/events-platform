"use client";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { formatEventCardDate } from "@/lib/utils/eventDateFormatters";

interface Props {
  title: string;
  slug: string;
  location: string;
  date: Date | string;
  time: string;
  image: string;
  venueType: "inside" | "outside";
  minRating: number;
  maxRating: number;
  bookingsCount: number;
  maxParticipants: number;
  duration: number;
  organizer?: string;
}

const EventCard = ({
  title,
  slug,
  location,
  date,
  time,
  image,
  venueType,
  minRating,
  maxRating,
  bookingsCount,
  maxParticipants,
  duration,
  organizer,
}: Props) => {
  const availableSpots = Math.max(0, maxParticipants - bookingsCount);
  return (
    <Link
      href={`/events/${slug}`}
      id="event-card"
      onClick={() =>
        posthog.capture("event_card_clicked", {
          event_title: title,
          event_slug: slug,
          event_location: location,
          event_date: date,
          event_venue_type: venueType,
        })
      }>
      <Image
        src={image}
        alt={title}
        width={410}
        height={300}
        className="poster"
      />

      <div className="flex flex-row gap-2">
        <Image src="/icons/pin.svg" alt="location" width={14} height={14} />
        <p>{location}</p>
      </div>

      <p className="title">{title}</p>

      <div className="datetime">
        <div>
          <Image src="/icons/calendar.svg" alt="date" width={14} height={14} />
          <p>{formatEventCardDate(date)}</p>
        </div>
        <div>
          <Image src="/icons/clock.svg" alt="time" width={14} height={14} />
          <p>{time}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p>Venue: {venueType}</p>
        <p>
          Rating: {minRating} - {maxRating}
        </p>
        <p>
          Spots: {availableSpots}/{maxParticipants}
        </p>
        <p>Duration: {duration} min</p>
        {organizer ? <p>Hosted by {organizer}</p> : null}
      </div>
    </Link>
  );
};

export default EventCard;
