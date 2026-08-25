"use client";

import Link from "next/link";
import { useState } from "react";
import type { EventParticipant } from "@/lib/actions/booking.actions";
import type {
  TournamentDTO,
  TournamentSettingsInput,
} from "@/lib/actions/tournament.actions";
import type { PointsTo, ResultSorting, StartMode, TournamentType } from "@/lib/tournament";
import { PLAYERS_PER_COURT, restingCount } from "@/lib/tournament";
import { playerDisplayName } from "@/lib/tournament/lineup";
import PadelCourt from "./PadelCourt";

const POINTS_OPTIONS: PointsTo[] = [11, 16, 21, 24, 32];

function groupPlayersByCourt(
  players: Array<{ name: string; fieldName?: string }>,
  courts: string[],
): Array<{ name: string; players: string[] }> {
  const byField = new Map<string, string[]>();

  for (const player of players) {
    const fieldName = player.fieldName?.trim();
    if (!fieldName) continue;
    const list = byField.get(fieldName) ?? [];
    list.push(player.name);
    byField.set(fieldName, list);
  }

  if (byField.size > 0) {
    return Array.from(byField.entries()).map(([name, names]) => ({
      name,
      players: names,
    }));
  }

  return courts.map((name, index) => ({
    name,
    players: players
      .slice(index * PLAYERS_PER_COURT, index * PLAYERS_PER_COURT + PLAYERS_PER_COURT)
      .map((player) => player.name),
  }));
}

export default function TournamentSetup({
  slug,
  participants,
  lineupPlayers,
  maxParticipants,
  initialSettings,
  submitting,
  error,
  onStart,
}: {
  slug: string;
  participants: EventParticipant[];
  lineupPlayers?: TournamentDTO["players"];
  maxParticipants: number;
  initialSettings?: Partial<TournamentSettingsInput>;
  submitting: boolean;
  error: string | null;
  onStart: (settings: TournamentSettingsInput) => void;
}) {
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    initialSettings?.tournamentType ?? "americano",
  );
  const [startMode, setStartMode] = useState<StartMode>(
    initialSettings?.startMode ?? "custom",
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

  const previewPlayers =
    lineupPlayers && lineupPlayers.length > 0
      ? lineupPlayers.map((player) => ({
          name: player.name,
          fieldName: player.fieldName,
        }))
      : participants.map((participant) => ({
          name: playerDisplayName(participant.firstName, participant.lastName),
          fieldName: undefined as string | undefined,
        }));
  const playerCount = previewPlayers.length;
  const remainingSpots = Math.max(0, maxParticipants - playerCount);
  const lineupCourts = groupPlayersByCourt(previewPlayers, courts);
  const hasNamedLineupCourts = previewPlayers.some((player) =>
    Boolean(player.fieldName?.trim()),
  );
  const startCourts = hasNamedLineupCourts
    ? lineupCourts.map((court) => court.name)
    : courts;
  const resters = restingCount(playerCount, startCourts.length);
  const needsRestConfirm =
    resters > 0 || playerCount % PLAYERS_PER_COURT !== 0;
  const fullCourts = lineupCourts.filter(
    (court) => court.players.length === PLAYERS_PER_COURT,
  ).length;
  const customStartBlocked = startMode === "custom" && fullCourts < 1;

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
      startMode,
      pointsTo,
      resultSorting,
      courts: startCourts.map((name) => ({ name })),
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
          {playerCount} players in lineup
          {participants.length !== playerCount
            ? ` · ${participants.length} signed up`
            : ""}{" "}
          · capacity {startCourts.length * PLAYERS_PER_COURT} per round
        </p>
        <Link
          href={`/events/${slug}/tournament/lineup`}
          className="tournament-button tournament-button--primary">
          {remainingSpots > 0
            ? "Complete player lineup"
            : "Edit player lineup"}
        </Link>

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
          <legend>Opening round</legend>
          <label className="tournament-select-field">
            <span>How to start</span>
            <select
              className="tournament-select"
              value={startMode}
              onChange={(event) =>
                setStartMode(event.target.value as StartMode)
              }
              aria-describedby="start-mode-hint">
              <option value="custom">Custom</option>
              <option value="random">Random</option>
            </select>
          </label>
          <p id="start-mode-hint" className="tournament-hint">
            {startMode === "custom"
              ? "Start exactly as you set the courts and players in the lineup. Players on the same side of a court are partners."
              : "Mix partners by moving players off the courts they belong to, into random positions."}
          </p>
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

        {!hasNamedLineupCourts && (
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
        )}

        <div className="tournament-players-preview">
          <div className="tournament-players-preview__top">
            <h3>Courts & players</h3>
            <Link
              href={`/events/${slug}/tournament/lineup`}
              className="tournament-button tournament-button--ghost">
              {remainingSpots > 0
                ? `Arrange players (${remainingSpots} left)`
                : "Rearrange lineup"}
            </Link>
          </div>
          <ul className="tournament-court-preview">
            {lineupCourts.map((court, index) => (
              <li key={`${court.name}-${index}`} className="tournament-match">
                <PadelCourt
                  courtName={court.name}
                  teamA={court.players.slice(0, 2)}
                  teamB={court.players.slice(2, 4)}
                />
              </li>
            ))}
          </ul>
        </div>

        {confirmResting && (
          <div className="tournament-confirm" role="alertdialog">
            <p>
              {resters > 0
                ? `${resters} player${resters === 1 ? "" : "s"} will sit out each round.`
                : `${playerCount % PLAYERS_PER_COURT} player(s) will sit out to fill courts of 4.`}
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

        {customStartBlocked && (
          <p className="tournament-error">
            Custom start needs at least one court with 4 players. Fill a court
            or choose random.
          </p>
        )}

        {!confirmResting && (
          <button
            type="button"
            className="tournament-button tournament-button--primary"
            onClick={handleStartClick}
            disabled={submitting || playerCount < 4 || customStartBlocked}>
            {submitting ? "Starting…" : "Start tournament"}
          </button>
        )}

        {playerCount < 4 && (
          <p className="tournament-error">
            Need at least 4 players to start. Add the rest of the lineup.
          </p>
        )}
      </div>
    </section>
  );
}
