"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MatchScoreInput,
  TournamentDTO,
} from "@/lib/actions/tournament.actions";
import PadelCourt from "./PadelCourt";

type ScoreDraft = Record<string, { teamA: string; teamB: string }>;

function draftsFromRound(
  round: TournamentDTO["rounds"][number] | undefined,
): ScoreDraft {
  if (!round) return {};
  const next: ScoreDraft = {};
  for (const match of round.matches) {
    next[match.id] = {
      teamA: match.teamA.score === null ? "" : String(match.teamA.score),
      teamB: match.teamB.score === null ? "" : String(match.teamB.score),
    };
  }
  return next;
}

function parseDraftScores(
  round: TournamentDTO["rounds"][number] | undefined,
  drafts: ScoreDraft,
  pointsTo: number,
): MatchScoreInput[] | null {
  if (!round) return null;

  const scores: MatchScoreInput[] = [];
  for (const match of round.matches) {
    const draft = drafts[match.id];
    if (!draft || draft.teamA === "" || draft.teamB === "") return null;

    const teamAScore = Number(draft.teamA);
    const teamBScore = Number(draft.teamB);
    if (
      !Number.isInteger(teamAScore) ||
      !Number.isInteger(teamBScore) ||
      teamAScore < 0 ||
      teamBScore < 0 ||
      teamAScore + teamBScore !== pointsTo
    ) {
      return null;
    }

    scores.push({ matchId: match.id, teamAScore, teamBScore });
  }

  return scores;
}

export default function RoundView({
  tournament,
  busy,
  error,
  onNextRound,
  onFinalRound,
  onStandings,
  onSelectRound,
}: {
  tournament: TournamentDTO;
  busy: boolean;
  error: string | null;
  onNextRound: (scores: MatchScoreInput[]) => void;
  onFinalRound: (scores: MatchScoreInput[]) => void;
  onStandings: (scores: MatchScoreInput[] | null) => void;
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

  const [drafts, setDrafts] = useState<ScoreDraft>(() =>
    draftsFromRound(round),
  );

  useEffect(() => {
    setDrafts(draftsFromRound(round));
  }, [round]);

  const parsedScores = useMemo(
    () => parseDraftScores(round, drafts, tournament.pointsTo),
    [round, drafts, tournament.pointsTo],
  );
  const allScoresProvided = parsedScores !== null;

  if (!round) {
    return <p className="tournament-empty">No rounds yet.</p>;
  }

  const canOfferFinal =
    !round.isFinal &&
    tournament.rounds.length >= 1 &&
    !tournament.rounds.some((item) => item.isFinal);

  const playerNames = (ids: string[]) =>
    ids.map((id) => playerNameById.get(id) ?? "Player");

  const updateDraft = (
    matchId: string,
    side: "teamA" | "teamB",
    value: string,
  ) => {
    const trimmed = value.trim();

    setDrafts((prev) => {
      const otherSide = side === "teamA" ? "teamB" : "teamA";
      let nextValue = trimmed;
      let otherValue = "";

      if (trimmed === "") {
        nextValue = "";
        otherValue = "";
      } else if (/^\d+$/.test(trimmed)) {
        const clamped = Math.min(Number(trimmed), tournament.pointsTo);
        nextValue = String(clamped);
        otherValue = String(tournament.pointsTo - clamped);
      } else {
        otherValue = prev[matchId]?.[otherSide] ?? "";
      }

      return {
        ...prev,
        [matchId]: {
          teamA: side === "teamA" ? nextValue : otherValue,
          teamB: side === "teamB" ? nextValue : otherValue,
        },
      };
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
              onClick={() => parsedScores && onNextRound(parsedScores)}
              disabled={!allScoresProvided || busy}>
              New round
            </button>
          )}
          {canOfferFinal && (
            <button
              type="button"
              className="tournament-button"
              onClick={() => parsedScores && onFinalRound(parsedScores)}
              disabled={!allScoresProvided || busy}>
              Final
            </button>
          )}
          <button
            type="button"
            className="tournament-button tournament-button--primary"
            onClick={() => onStandings(parsedScores)}
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
            draft.teamA !== "" &&
            draft.teamB !== "" &&
            Number.isInteger(a) &&
            Number.isInteger(b) &&
            a >= 0 &&
            b >= 0 &&
            a + b === tournament.pointsTo;

          return (
            <li key={match.id} className="tournament-match">
              <PadelCourt
                courtName={courtNameById.get(match.courtId) ?? "Court"}
                teamA={playerNames(match.teamA.playerIds)}
                teamB={playerNames(match.teamB.playerIds)}
                teamAScore={draft.teamA}
                teamBScore={draft.teamB}
                pointsTo={tournament.pointsTo}
                busy={busy}
                onScoreChange={(side, value) =>
                  updateDraft(match.id, side, value)
                }
              />
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
