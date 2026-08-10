"use client";

import { useState } from "react";
import type { EventParticipant } from "@/lib/actions/booking.actions";
import type { TournamentSettingsInput } from "@/lib/actions/tournament.actions";
import type { PointsTo, ResultSorting, TournamentType } from "@/lib/tournament";
import { PLAYERS_PER_COURT, restingCount } from "@/lib/tournament";

const POINTS_OPTIONS: PointsTo[] = [11, 16, 21, 24, 32];

export default function TournamentSetup({
  participants,
  initialSettings,
  submitting,
  error,
  onStart,
}: {
  participants: EventParticipant[];
  initialSettings?: Partial<TournamentSettingsInput>;
  submitting: boolean;
  error: string | null;
  onStart: (settings: TournamentSettingsInput) => void;
}) {
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    initialSettings?.tournamentType ?? "americano",
  );
  const [pointsTo, setPointsTo] = useState<PointsTo>(
    initialSettings?.pointsTo ?? 16,
  );
  const [resultSorting, setResultSorting] = useState<ResultSorting>(
    initialSettings?.resultSorting ?? "pointsFirst",
  );
  const [courts, setCourts] = useState<string[]>(
    initialSettings?.courts?.map((court) => court.name) ?? ["Court 1"],
  );
  const [confirmResting, setConfirmResting] = useState(false);

  const resters = restingCount(participants.length, courts.length);
  const needsRestConfirm =
    resters > 0 || participants.length % PLAYERS_PER_COURT !== 0;

  const updateCourtName = (index: number, name: string) => {
    setCourts((prev) => prev.map((court, i) => (i === index ? name : court)));
  };

  const addCourt = () => {
    setCourts((prev) => [...prev, `Court ${prev.length + 1}`]);
  };

  const removeCourt = (index: number) => {
    setCourts((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const submit = () => {
    onStart({
      tournamentType,
      pointsTo,
      resultSorting,
      courts: courts.map((name) => ({ name })),
    });
  };

  const handleStartClick = () => {
    if (needsRestConfirm && !confirmResting) {
      setConfirmResting(true);
      return;
    }
    submit();
  };

  return (
    <section className="tournament-setup">
      <div className="tournament-panel">
        <h2>Tournament settings</h2>
        <p className="tournament-panel__subtitle">
          {participants.length} players signed up · capacity{" "}
          {courts.length * PLAYERS_PER_COURT} per round
        </p>

        <fieldset className="tournament-fieldset">
          <legend>Tournament type</legend>
          <div className="tournament-options">
            {(["americano", "mexicano"] as const).map((type) => (
              <label key={type} className="tournament-option">
                <input
                  type="radio"
                  name="tournamentType"
                  value={type}
                  checked={tournamentType === type}
                  onChange={() => setTournamentType(type)}
                />
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="tournament-fieldset">
          <legend>Scoring</legend>
          <div className="tournament-options tournament-options--wrap">
            {POINTS_OPTIONS.map((value) => (
              <label key={value} className="tournament-option">
                <input
                  type="radio"
                  name="pointsTo"
                  value={value}
                  checked={pointsTo === value}
                  onChange={() => setPointsTo(value)}
                />
                <span>Play to {value}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="tournament-fieldset">
          <legend>Result sorting</legend>
          <div className="tournament-options">
            <label className="tournament-option">
              <input
                type="radio"
                name="resultSorting"
                checked={resultSorting === "pointsFirst"}
                onChange={() => setResultSorting("pointsFirst")}
              />
              <span>Points then wins</span>
            </label>
            <label className="tournament-option">
              <input
                type="radio"
                name="resultSorting"
                checked={resultSorting === "winsFirst"}
                onChange={() => setResultSorting("winsFirst")}
              />
              <span>Wins then points</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="tournament-fieldset">
          <legend>Courts</legend>
          <ul className="tournament-court-list">
            {courts.map((name, index) => (
              <li key={`court-${index}`}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateCourtName(index, e.target.value)}
                  aria-label={`Court ${index + 1} name`}
                />
                <button
                  type="button"
                  className="tournament-button tournament-button--ghost"
                  onClick={() => removeCourt(index)}
                  disabled={courts.length <= 1}
                  aria-label={`Remove court ${index + 1}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="tournament-button tournament-button--ghost"
            onClick={addCourt}>
            Add court
          </button>
        </fieldset>

        <div className="tournament-players-preview">
          <h3>Players</h3>
          <ul>
            {participants.map((participant, index) => {
              const name =
                [participant.firstName, participant.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "Participant";
              return (
                <li key={participant.id}>
                  <span>{index + 1}.</span> {name}
                </li>
              );
            })}
          </ul>
        </div>

        {confirmResting && (
          <div className="tournament-confirm" role="alertdialog">
            <p>
              {resters > 0
                ? `${resters} player${resters === 1 ? "" : "s"} will sit out each round.`
                : `${participants.length % PLAYERS_PER_COURT} player(s) will sit out to fill courts of 4.`}
            </p>
            <div className="tournament-actions">
              <button
                type="button"
                className="tournament-button tournament-button--ghost"
                onClick={() => setConfirmResting(false)}
                disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="tournament-button"
                onClick={submit}
                disabled={submitting}>
                {submitting ? "Starting…" : "Confirm & start"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="tournament-error">{error}</p>}

        {!confirmResting && (
          <button
            type="button"
            className="tournament-button tournament-button--primary"
            onClick={handleStartClick}
            disabled={submitting || participants.length < 4}>
            {submitting ? "Starting…" : "Start tournament"}
          </button>
        )}

        {participants.length < 4 && (
          <p className="tournament-error">
            Need at least 4 signed-up players to start.
          </p>
        )}
      </div>
    </section>
  );
}
