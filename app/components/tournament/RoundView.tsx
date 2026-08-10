"use client";

import { useEffect, useMemo, useState } from "react";
import type { TournamentDTO } from "@/lib/actions/tournament.actions";
import { isRoundComplete } from "@/lib/tournament";

type ScoreDraft = Record<string, { teamA: string; teamB: string }>;

export default function RoundView({
  tournament,
  busy,
  error,
  onSaveScore,
  onNextRound,
  onFinalRound,
  onStandings,
  onSelectRound,
}: {
  tournament: TournamentDTO;
  busy: boolean;
  error: string | null;
  onSaveScore: (input: {
    roundIndex: number;
    matchId: string;
    teamAScore: number;
    teamBScore: number;
  }) => Promise<void>;
  onNextRound: () => void;
  onFinalRound: () => void;
  onStandings: () => void;
  onSelectRound: (roundIndex: number) => void;
}) {
  const round = tournament.rounds[tournament.currentRoundIndex];
  const courtNameById = useMemo(
    () => new Map(tournament.courts.map((court) => [court.id, court.name])),
    [tournament.courts],
  );
  const playerNameById = useMemo(
    () => new Map(tournament.players.map((player) => [player.id, player.name])),
    [tournament.players],
  );

  const [drafts, setDrafts] = useState<ScoreDraft>({});

  useEffect(() => {
    if (!round) return;
    const next: ScoreDraft = {};
    for (const match of round.matches) {
      next[match.id] = {
        teamA: match.teamA.score === null ? "" : String(match.teamA.score),
        teamB: match.teamB.score === null ? "" : String(match.teamB.score),
      };
    }
    setDrafts(next);
  }, [round]);

  if (!round) {
    return <p className="tournament-empty">No rounds yet.</p>;
  }

  const complete = isRoundComplete(round);
  const canFinal =
    complete &&
    !round.isFinal &&
    tournament.rounds.length >= 1 &&
    !tournament.rounds.some((item) => item.isFinal);

  const names = (ids: string[]) =>
    ids.map((id) => playerNameById.get(id) ?? "Player").join(" & ");

  const updateDraft = (
    matchId: string,
    side: "teamA" | "teamB",
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        teamA: prev[matchId]?.teamA ?? "",
        teamB: prev[matchId]?.teamB ?? "",
        [side]: value,
      },
    }));
  };

  const saveMatch = async (matchId: string) => {
    const draft = drafts[matchId];
    if (!draft) return;
    const teamAScore = Number(draft.teamA);
    const teamBScore = Number(draft.teamB);
    if (
      !Number.isInteger(teamAScore) ||
      !Number.isInteger(teamBScore) ||
      teamAScore < 0 ||
      teamBScore < 0
    ) {
      return;
    }
    await onSaveScore({
      roundIndex: tournament.currentRoundIndex,
      matchId,
      teamAScore,
      teamBScore,
    });
  };

  return (
    <section className="tournament-round">
      <div className="tournament-round__toolbar">
        <div className="tournament-round-tabs">
          {tournament.rounds.map((item) => (
            <button
              key={item.index}
              type="button"
              className={
                item.index === tournament.currentRoundIndex
                  ? "tournament-round-tab is-active"
                  : "tournament-round-tab"
              }
              onClick={() => onSelectRound(item.index)}
              disabled={busy}>
              {item.isFinal ? "Final" : `Round ${item.index + 1}`}
            </button>
          ))}
        </div>

        <div className="tournament-actions">
          {!round.isFinal && (
            <button
              type="button"
              className="tournament-button"
              onClick={onNextRound}
              disabled={!complete || busy}>
              New round
            </button>
          )}
          {canFinal && (
            <button
              type="button"
              className="tournament-button"
              onClick={onFinalRound}
              disabled={busy}>
              Final
            </button>
          )}
          <button
            type="button"
            className="tournament-button tournament-button--primary"
            onClick={onStandings}
            disabled={busy}>
            Standings
          </button>
        </div>
      </div>

      <h2>{round.isFinal ? "Final" : `Round ${round.index + 1}`}</h2>

      <ul className="tournament-match-list">
        {round.matches.map((match) => {
          const draft = drafts[match.id] ?? { teamA: "", teamB: "" };
          const a = Number(draft.teamA);
          const b = Number(draft.teamB);
          const sumOk =
            Number.isInteger(a) &&
            Number.isInteger(b) &&
            a >= 0 &&
            b >= 0 &&
            a + b === tournament.pointsTo;
          const saved =
            match.teamA.score !== null &&
            match.teamB.score !== null &&
            String(match.teamA.score) === draft.teamA &&
            String(match.teamB.score) === draft.teamB;

          return (
            <li key={match.id} className="tournament-match">
              <div className="tournament-match__court">
                {courtNameById.get(match.courtId) ?? "Court"}
              </div>
              <div className="tournament-match__teams">
                <div className="tournament-match__team">
                  <span>{names(match.teamA.playerIds)}</span>
                  <input
                    type="number"
                    min={0}
                    max={tournament.pointsTo}
                    inputMode="numeric"
                    value={draft.teamA}
                    onChange={(e) =>
                      updateDraft(match.id, "teamA", e.target.value)
                    }
                    aria-label={`Score for ${names(match.teamA.playerIds)}`}
                    disabled={busy}
                  />
                </div>
                <span className="tournament-match__vs">vs</span>
                <div className="tournament-match__team">
                  <span>{names(match.teamB.playerIds)}</span>
                  <input
                    type="number"
                    min={0}
                    max={tournament.pointsTo}
                    inputMode="numeric"
                    value={draft.teamB}
                    onChange={(e) =>
                      updateDraft(match.id, "teamB", e.target.value)
                    }
                    aria-label={`Score for ${names(match.teamB.playerIds)}`}
                    disabled={busy}
                  />
                </div>
              </div>
              <button
                type="button"
                className="tournament-button"
                onClick={() => saveMatch(match.id)}
                disabled={busy || !sumOk || saved}>
                {saved ? "Saved" : "Save score"}
              </button>
              {!sumOk && draft.teamA !== "" && draft.teamB !== "" && (
                <p className="tournament-hint">
                  Scores must add up to {tournament.pointsTo}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {round.restingPlayerIds.length > 0 && (
        <div className="tournament-resting">
          <h3>Sitting out</h3>
          <p>
            {round.restingPlayerIds
              .map((id) => playerNameById.get(id) ?? "Player")
              .join(", ")}
          </p>
        </div>
      )}

      {error && <p className="tournament-error">{error}</p>}
    </section>
  );
}
