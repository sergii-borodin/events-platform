"use client";
import React, { useCallback, useEffect, useState } from "react";
import CreateEventForm from "../components/CreateEventForm";
import PadelCatcherLoader from "../components/PadelCatcherLoader";
import { useAuth } from "../providers/AuthProvider";
import { useRouter } from "next/navigation";

const CreateNewEvent = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  const handleCreateEvent = useCallback<
    React.ComponentProps<typeof CreateEventForm>["onSubmit"]
  >(
    async (data) => {
      setSubmitting(true);
      try {
        const formData = new FormData();

        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("overview", data.overview);
        if (data.image) formData.append("image", data.image);
        formData.append("venue", data.venue);
        formData.append("location", data.location);
        formData.append("date", data.date);
        formData.append("time", data.time);
        formData.append("venueType", data.venueType);
        formData.append("minRating", String(data.minRating));
        formData.append("maxRating", String(data.maxRating));
        formData.append("maxParticipants", String(data.maxParticipants));
        formData.append("duration", String(data.duration));
        formData.append("organizer", data.organizer);
        formData.append("tags", JSON.stringify(data.tags));

        const response = await fetch("/api/events", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message ?? "Failed to create event");
        }

        const result = (await response.json().catch(() => null)) as {
          event?: { slug?: string };
        } | null;

        if (result?.event?.slug) {
          router.push(`/events/${result.event.slug}`);
        } else {
          router.push("/events");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  if (loading || !user) {
    return (
      <PadelCatcherLoader
        label={loading ? "Checking your session…" : "Redirecting to sign in…"}
      />
    );
  }

  return (
    <>
      {submitting && (
        <PadelCatcherLoader overlay label="Uploading & creating event…" />
      )}
      <CreateEventForm
        onSubmit={handleCreateEvent}
        organizerName={user.displayName?.trim() ?? ""}
      />
    </>
  );
};

export default CreateNewEvent;
