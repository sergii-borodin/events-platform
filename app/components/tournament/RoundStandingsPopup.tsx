"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { StandingRow } from "@/lib/tournament";

const ROW_HEIGHT = 52;
const HOLD_MS = 1000;
const SLIDE_MS = 750;

export default function RoundStandingsPopup({
  previous,
  next,
  roundLabel,
  continueLabel,
  busy,
  error,
  onContinue,
}: {
  previous: StandingRow[];
  next: StandingRow[];
  roundLabel: string;
  continueLabel: string;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
}) {
  const titleId = useId();
  const [canAnimate, setCanAnimate] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      setShowUpdated(true);
      return;
    }

    const ready = window.requestAnimationFrame(() => setCanAnimate(true));
    const timer = window.setTimeout(() => setShowUpdated(true), HOLD_MS);

    return () => {
      window.cancelAnimationFrame(ready);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onContinue();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onContinue]);

  const nextById = useMemo(
    () => new Map(next.map((row) => [row.playerId, row])),
    [next],
  );

  const rows = previous.map((from) => ({
    from,
    to: nextById.get(from.playerId) ?? from,
  }));

  return (
    <div className="round-standings-overlay">
      <div
        className="round-standings-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}>
        <div className="round-standings-popup__header">
          <div>
            <h2 id={titleId}>Standings</h2>
            <p className="round-standings-popup__subtitle">
              {showUpdated
                ? `After ${roundLabel}`
                : `Before ${roundLabel}`}
            </p>
          </div>
          <button
            type="button"
            className="round-standings-popup__close"
            onClick={onContinue}
            disabled={busy}
            aria-label={continueLabel}>
            ×
          </button>
        </div>

        <div className="round-standings-table">
          <div className="round-standings-table__head">
            <span>Place</span>
            <span>Player</span>
            <span>Pts</span>
            <span>Wins</span>
          </div>
          <div
            className="round-standings-table__body"
            style={{ height: rows.length * ROW_HEIGHT }}
            aria-live="polite">
            {rows.map(({ from, to }) => {
              const displayed = showUpdated ? to : from;
              const movedUp = showUpdated && to.rank < from.rank;
              const movedDown = showUpdated && to.rank > from.rank;

              return (
                <div
                  key={from.playerId}
                  className={[
                    "round-standings-row",
                    canAnimate ? "is-ready" : "",
                    movedUp ? "round-standings-row--up" : "",
                    movedDown ? "round-standings-row--down" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    height: ROW_HEIGHT,
                    zIndex: movedUp ? 2 : movedDown ? 1 : 0,
                    transform: `translateY(${(displayed.rank - 1) * ROW_HEIGHT}px)`,
                    transitionDuration: `${SLIDE_MS}ms`,
                  }}>
                  <span className="round-standings-row__place">
                    {displayed.rank}
                  </span>
                  <span className="round-standings-row__name">{from.name}</span>
                  <span className="round-standings-row__stat">
                    {displayed.points}
                  </span>
                  <span className="round-standings-row__stat">
                    {displayed.wins}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error ? <p className="tournament-error">{error}</p> : null}

        <div className="round-standings-popup__actions">
          <button
            type="button"
            className="tournament-button tournament-button--primary"
            onClick={onContinue}
            disabled={busy}
            autoFocus>
            {busy ? "Generating round…" : continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
