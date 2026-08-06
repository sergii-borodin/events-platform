"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/actions/booking.actions";
import posthog from "posthog-js";
import PadelCatcherLoader from "@/app/components/PadelCatcherLoader";

const BookEvent = ({ eventId, slug }: { eventId: string; slug: string }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getErrorMessage = (reason: string) => {
    switch (reason) {
      case "duplicate":
        return "This email has already booked a spot for this event.";
      case "full":
        return "Sorry, this event is fully booked.";
      case "event-not-found":
      case "invalid-event":
        return "This event is no longer available.";
      default:
        return "Booking failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await createBooking({
        eventId,
        firstName,
        lastName,
        email,
        slug,
      });

      if (result.success) {
        setSubmitted(true);
        router.refresh();
        posthog.capture("event_booked", { eventId, slug, email });
      } else {
        console.error("Booking creation failed");
        posthog.captureException("Booking creation failed");
        setError(getErrorMessage(result.reason));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="book-event">
      {submitting && <PadelCatcherLoader overlay label="Booking your spot…" />}
      {submitted ? (
        <p className="text-sm">Thank you for signing up!</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="firstName">Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              id="firstName"
              placeholder="Enter your name"
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label htmlFor="lastName">Surname</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              id="lastName"
              placeholder="Enter your surname"
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="email"
              placeholder="Enter your email address"
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className="button-submit" disabled={submitting}>
            {submitting ? "Booking…" : "Submit"}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
};
export default BookEvent;
