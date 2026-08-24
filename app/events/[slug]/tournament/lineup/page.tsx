import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LineupForm from "@/app/components/tournament/LineupForm";
import PadelCatcherLoader from "@/app/components/PadelCatcherLoader";
import { getEventParticipants } from "@/lib/actions/booking.actions";
import { getEventBySlug } from "@/lib/actions/event.actions";
import { getTournamentBySlug } from "@/lib/actions/tournament.actions";

export default function TournamentLineupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={<PadelCatcherLoader label="Loading lineup…" />}>
      <TournamentLineupContent params={params} />
    </Suspense>
  );
}

async function TournamentLineupContent({
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

  const readOnly =
    tournament?.status === "playing" || tournament?.status === "finished";

  return (
    <section id="tournament">
      <div className="tournament-app">
        <header className="tournament-header">
          <div className="tournament-header__top">
            <Link href={`/events/${slug}/tournament`} className="tournament-back">
              ← Back to tournament
            </Link>
          </div>
          <h1>{event.title}</h1>
          <p className="tournament-header__meta">Player lineup</p>
        </header>

        <LineupForm
          slug={slug}
          participants={participants}
          savedPlayers={tournament?.players}
          savedFields={tournament?.lineupFields}
          maxParticipants={event.maxParticipants}
          readOnly={readOnly}
        />
      </div>
    </section>
  );
}
