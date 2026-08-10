"use client";

import Link from "next/link";

export default function TournamentHeader({
  eventTitle,
  slug,
  tournamentType,
  pointsTo,
  onReset,
  resetting,
}: {
  eventTitle: string;
  slug: string;
  tournamentType?: string;
  pointsTo?: number;
  onReset?: () => void;
  resetting?: boolean;
}) {
  return (
    <header className="tournament-header">
      <div className="tournament-header__top">
        <Link href={`/events/${slug}`} className="tournament-back">
          ← Back to event
        </Link>
        {onReset && (
          <button
            type="button"
            className="tournament-button tournament-button--ghost"
            onClick={onReset}
            disabled={resetting}>
            {resetting ? "Resetting…" : "New tournament"}
          </button>
        )}
      </div>
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
