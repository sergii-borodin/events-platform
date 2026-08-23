import Link from "next/link";

export default function TournamentHeader({
  eventTitle,
  slug,
  tournamentType,
  pointsTo,
}: {
  eventTitle: string;
  slug: string;
  tournamentType?: string;
  pointsTo?: number;
}) {
  return (
    <header className="tournament-header">
      <Link href={`/events/${slug}`} className="tournament-back">
        ← Back to event
      </Link>
      <h1>{eventTitle}</h1>
      {(tournamentType || pointsTo) && (
        <p className="tournament-header__meta">
          {tournamentType
            ? tournamentType.charAt(0).toUpperCase() + tournamentType.slice(1)
            : null}
          {tournamentType && pointsTo ? " · " : null}
          {pointsTo ? `Play to ${pointsTo}` : null}
        </p>
      )}
    </header>
  );
}
