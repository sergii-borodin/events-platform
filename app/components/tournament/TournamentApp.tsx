"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { EventParticipant } from "@/lib/actions/booking.actions";
import {
  createOrUpdateTournamentSetup,
  finishTournament,
  generateFinalRound,
  generateNextRound,
  generateTournamentRecaps,
  goToRound,
  setRoundScores,
  startTournament,
  type MatchScoreInput,
  type TournamentDTO,
  type TournamentSettingsInput,
} from "@/lib/actions/tournament.actions";
import {
  computePlayerArcs,
  computeStandings,
  type FeedbackTone,
} from "@/lib/tournament";
import FeedbackTonePicker from "./FeedbackTonePicker";
import PlayerRecaps from "./PlayerRecaps";
import RoundView from "./RoundView";
import StandingsTable from "./StandingsTable";
import TournamentHeader from "./TournamentHeader";
import TournamentSetup from "./TournamentSetup";

type View = "setup" | "round" | "standings";

function initialView(tournament: TournamentDTO | null): View {
  if (!tournament || tournament.status === "setup") return "setup";
  if (tournament.status === "finished") return "standings";
  return "round";
}

export default function TournamentApp({
  slug,
  eventTitle,
  participants,
  initialTournament,
}: {
  slug: string;
  eventTitle: string;
  participants: EventParticipant[];
  initialTournament: TournamentDTO | null;
}) {
  const router = useRouter();
  const [tournament, setTournament] = useState(initialTournament);
  const [view, setView] = useState<View>(() => initialView(initialTournament));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tone, setTone] = useState<FeedbackTone>(
    initialTournament?.feedbackTone ?? "neutral",
  );
  const [confirmRoast, setConfirmRoast] = useState(false);

  const run = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  const handleStart = (settings: TournamentSettingsInput) => {
    run(async () => {
      const setup = await createOrUpdateTournamentSetup({ slug, settings });
      if (!setup.success) {
        setError(
          setup.message ??
            (setup.reason === "not-enough-players"
              ? "Need at least 4 signed-up players."
              : "Could not save tournament setup."),
        );
        return;
      }

      const started = await startTournament(slug);
      if (!started.success) {
        setError(started.message ?? "Could not start tournament.");
        return;
      }

      setTournament(started.data);
      setView("round");
    });
  };

  const handleNextRound = (scores: MatchScoreInput[]) => {
    run(async () => {
      const result = await generateNextRound(slug, scores);
      if (!result.success) {
        setError(result.message ?? "Could not generate next round.");
        return;
      }
      setTournament(result.data);
      setView("round");
    });
  };

  const handleFinalRound = (scores: MatchScoreInput[]) => {
    run(async () => {
      const result = await generateFinalRound(slug, scores);
      if (!result.success) {
        setError(result.message ?? "Could not generate final.");
        return;
      }
      setTournament(result.data);
      setView("round");
    });
  };

  const handleStandings = (scores: MatchScoreInput[] | null) => {
    if (!scores || !tournament) {
      setError(null);
      setView("standings");
      return;
    }

    const roundIndex = tournament.currentRoundIndex;
    run(async () => {
      const result = await setRoundScores({ slug, roundIndex, scores });
      if (!result.success) {
        setError(result.message ?? "Could not save scores.");
        return;
      }
      setTournament(result.data);
      setView("standings");
    });
  };

  const handleFinish = () => {
    if (tone === "roast" && !confirmRoast) {
      setError("Confirm that everyone is OK with roast recaps.");
      return;
    }

    run(async () => {
      const result = await finishTournament(slug, { tone, confirmRoast });
      if (!result.success) {
        setError(result.message ?? "Could not finish tournament.");
        return;
      }
      setTournament(result.data);
      setView("standings");
    });
  };

  const handleRewriteRecaps = () => {
    if (tone === "roast" && !confirmRoast) {
      setError("Confirm that everyone is OK with roast recaps.");
      return;
    }

    run(async () => {
      const result = await generateTournamentRecaps(slug, {
        tone,
        confirmRoast,
      });
      if (!result.success) {
        setError(result.message ?? "Could not write recaps.");
        return;
      }
      setTournament(result.data);
    });
  };

  const handleSelectRound = (roundIndex: number) => {
    run(async () => {
      const result = await goToRound({ slug, roundIndex });
      if (!result.success) {
        setError("Could not switch round.");
        return;
      }
      setTournament(result.data);
      setView("round");
    });
  };

  const standings = useMemo(
    () =>
      tournament && tournament.rounds.length > 0
        ? computeStandings(
            tournament.players,
            tournament.rounds,
            tournament.resultSorting,
          )
        : [],
    [tournament],
  );

  const arcs = useMemo(
    () =>
      tournament && tournament.rounds.length > 0
        ? computePlayerArcs(
            tournament.players,
            tournament.rounds,
            tournament.resultSorting,
          )
        : [],
    [tournament],
  );

  const roastBlocked = tone === "roast" && !confirmRoast;
  const finished = tournament?.status === "finished";

  return (
    <div className="tournament-app">
      <TournamentHeader
        eventTitle={eventTitle}
        slug={slug}
        tournamentType={tournament?.tournamentType}
        pointsTo={tournament?.pointsTo}
      />

      {view === "setup" && (
        <TournamentSetup
          participants={participants}
          initialSettings={
            tournament
              ? {
                  tournamentType: tournament.tournamentType,
                  pointsTo: tournament.pointsTo,
                  resultSorting: tournament.resultSorting,
                  courts: tournament.courts,
                }
              : undefined
          }
          submitting={pending}
          error={error}
          onStart={handleStart}
        />
      )}

      {view === "round" && tournament && (
        <RoundView
          tournament={tournament}
          busy={pending}
          error={error}
          onNextRound={handleNextRound}
          onFinalRound={handleFinalRound}
          onStandings={handleStandings}
          onSelectRound={handleSelectRound}
        />
      )}

      {view === "standings" && tournament && (
        <section className="tournament-standings">
          {!finished && (
            <div className="tournament-actions">
              <button
                type="button"
                className="tournament-button tournament-button--ghost"
                onClick={() => setView("round")}
                disabled={pending}>
                Back to rounds
              </button>
            </div>
          )}

          <h2>Standings</h2>
          <StandingsTable standings={standings} />

          <div className="tournament-recaps">
            <h2>{finished ? "Player recaps" : "End of tournament recaps"}</h2>
            <FeedbackTonePicker
              tone={tone}
              onToneChange={setTone}
              confirmRoast={confirmRoast}
              onConfirmRoastChange={setConfirmRoast}
              disabled={pending}
            />
            <div className="tournament-actions">
              {finished ? (
                <button
                  type="button"
                  className="tournament-button tournament-button--primary"
                  onClick={handleRewriteRecaps}
                  disabled={pending || roastBlocked}>
                  {pending
                    ? "Writing recaps…"
                    : tournament.playerRecaps.length > 0
                      ? "Rewrite recaps"
                      : "Write recaps"}
                </button>
              ) : (
                <button
                  type="button"
                  className="tournament-button tournament-button--primary"
                  onClick={handleFinish}
                  disabled={pending || roastBlocked}>
                  {pending ? "Writing recaps…" : "End tournament"}
                </button>
              )}
            </div>
            {finished && (
              <PlayerRecaps arcs={arcs} recaps={tournament.playerRecaps} />
            )}
          </div>

          {error && <p className="tournament-error">{error}</p>}
        </section>
      )}
    </div>
  );
}
