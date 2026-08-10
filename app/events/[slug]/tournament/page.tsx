import { notFound } from "next/navigation";
import { Suspense } from "react";
import TournamentApp from "@/app/components/tournament/TournamentApp";
import PadelCatcherLoader from "@/app/components/PadelCatcherLoader";
import { getEventParticipants } from "@/lib/actions/booking.actions";
import { getEventBySlug } from "@/lib/actions/event.actions";
import { getTournamentBySlug } from "@/lib/actions/tournament.actions";

export default function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={<PadelCatcherLoader label="Loading tournament…" />}>
      <TournamentPageContent params={params} />
    </Suspense>
  );
}

async function TournamentPageContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) return notFound();

  const [participants, tournament] = await Promise.all([
    getEventParticipants(event._id),
    getTournamentBySlug(slug),
  ]);

  return (
    <section id="tournament">
      <TournamentApp
        slug={slug}
        eventTitle={event.title}
        participants={participants}
        initialTournament={tournament}
      />
    </section>
  );
}
