import { computeStandings } from "./standings";
import type {
  EngineCourt,
  EngineMatch,
  EnginePlayer,
  EngineRound,
  ResultSorting,
  TournamentType,
} from "./types";
import {
  PLAYERS_PER_COURT,
  buildHistories,
  createId,
  pickLeastPlayedAgainst,
  pickLeastPlayedWith,
  removeId,
  shuffleInPlace,
  takeRandom,
} from "./utils";

export type GenerateRoundInput = {
  players: EnginePlayer[];
  courts: EngineCourt[];
  previousRounds: EngineRound[];
  tournamentType: TournamentType;
  resultSorting?: ResultSorting;
  isFinal?: boolean;
  roundIndex: number;
};

export function canStart(playerCount: number, courtCount: number): boolean {
  return (
    playerCount >= PLAYERS_PER_COURT &&
    courtCount >= 1 &&
    Math.min(playerCount, courtCount * PLAYERS_PER_COURT) >= PLAYERS_PER_COURT
  );
}

export function restingCount(playerCount: number, courtCount: number): number {
  const capacity = courtCount * PLAYERS_PER_COURT;
  if (playerCount <= capacity) {
    return playerCount % PLAYERS_PER_COURT;
  }
  return playerCount - capacity;
}

function selectPlayingPlayers(
  playerIds: string[],
  courtCount: number,
  restCounts: Map<string, number>,
): { playing: string[]; resting: string[] } {
  const capacity = courtCount * PLAYERS_PER_COURT;
  const playableSlots =
    Math.floor(Math.min(playerIds.length, capacity) / PLAYERS_PER_COURT) *
    PLAYERS_PER_COURT;

  if (playableSlots === 0) {
    return { playing: [], resting: [...playerIds] };
  }

  if (playerIds.length <= playableSlots) {
    return { playing: [...playerIds], resting: [] };
  }

  const sortedByRest = [...playerIds].sort((a, b) => {
    const restDiff = (restCounts.get(a) ?? 0) - (restCounts.get(b) ?? 0);
    if (restDiff !== 0) return restDiff;
    return Math.random() - 0.5;
  });

  const playing = sortedByRest.slice(0, playableSlots);
  const resting = sortedByRest.slice(playableSlots);
  return { playing, resting };
}

function formMatchesFromPool(
  pool: string[],
  courts: EngineCourt[],
  partners: ReturnType<typeof buildHistories>["partners"],
  opponents: ReturnType<typeof buildHistories>["opponents"],
): EngineMatch[] {
  const matches: EngineMatch[] = [];
  let remaining = shuffleInPlace([...pool]);
  const matchCount = Math.floor(remaining.length / PLAYERS_PER_COURT);

  for (let i = 0; i < matchCount; i += 1) {
    const court = courts[i % courts.length];

    const [p1, afterP1] = takeRandom(remaining);
    const p2 = pickLeastPlayedWith(p1, afterP1, partners);
    remaining = removeId(afterP1, p2);

    const p3 = pickLeastPlayedAgainst([p1, p2], remaining, opponents);
    remaining = removeId(remaining, p3);
    const p4 = pickLeastPlayedWith(p3, remaining, partners);
    remaining = removeId(remaining, p4);

    matches.push({
      id: createId("match"),
      courtId: court.id,
      teamA: { playerIds: [p1, p2], score: null },
      teamB: { playerIds: [p3, p4], score: null },
    });
  }

  return matches;
}

function scoreCandidateRound(
  matches: EngineMatch[],
  partners: ReturnType<typeof buildHistories>["partners"],
  opponents: ReturnType<typeof buildHistories>["opponents"],
): number {
  let score = 0;

  for (const match of matches) {
    const [a1, a2] = match.teamA.playerIds;
    const [b1, b2] = match.teamB.playerIds;
    if (a1 && a2) score += partners.get(a1)?.get(a2) ?? 0;
    if (b1 && b2) score += partners.get(b1)?.get(b2) ?? 0;

    for (const left of match.teamA.playerIds) {
      for (const right of match.teamB.playerIds) {
        score += opponents.get(left)?.get(right) ?? 0;
      }
    }
  }

  return score;
}

function generateFinalRound(
  players: EnginePlayer[],
  courts: EngineCourt[],
  previousRounds: EngineRound[],
  resultSorting: ResultSorting,
  roundIndex: number,
): EngineRound {
  const standings = computeStandings(players, previousRounds, resultSorting);
  const orderedIds = standings.map((row) => row.playerId);
  const playableSlots =
    Math.floor(orderedIds.length / PLAYERS_PER_COURT) * PLAYERS_PER_COURT;

  if (playableSlots < PLAYERS_PER_COURT) {
    const fallback = generateRound({
      players,
      courts,
      previousRounds,
      tournamentType: "americano",
      resultSorting,
      isFinal: false,
      roundIndex,
    });
    return { ...fallback, isFinal: true };
  }

  const playing = orderedIds.slice(0, playableSlots);
  const restingPlayerIds = orderedIds.slice(playableSlots);
  const matches: EngineMatch[] = [];

  for (let i = 0; i < playing.length; i += PLAYERS_PER_COURT) {
    const group = playing.slice(i, i + PLAYERS_PER_COURT);
    const court = courts[Math.floor(i / PLAYERS_PER_COURT) % courts.length];
    matches.push({
      id: createId("match"),
      courtId: court.id,
      // 1 & 2 vs 3 & 4, then 5 & 6 vs 7 & 8, …
      teamA: { playerIds: [group[0], group[1]], score: null },
      teamB: { playerIds: [group[2], group[3]], score: null },
    });
  }

  return {
    index: roundIndex,
    isFinal: true,
    restingPlayerIds,
    matches,
  };
}

export function generateRound(input: GenerateRoundInput): EngineRound {
  const {
    players,
    courts,
    previousRounds,
    tournamentType,
    resultSorting = "pointsFirst",
    isFinal = false,
    roundIndex,
  } = input;

  if (isFinal) {
    return generateFinalRound(
      players,
      courts,
      previousRounds,
      resultSorting,
      roundIndex,
    );
  }

  if (!canStart(players.length, courts.length)) {
    throw new Error("Not enough players or courts to generate a round");
  }

  const { partners, opponents, restCounts } = buildHistories(previousRounds);
  const allIds = players.map((player) => player.id);

  let orderedIds = [...allIds];

  if (tournamentType === "mexicano" && previousRounds.length > 0) {
    const standings = computeStandings(players, previousRounds, resultSorting);
    orderedIds = standings.map((row) => row.playerId);
  } else {
    shuffleInPlace(orderedIds);
  }

  const { playing, resting } = selectPlayingPlayers(
    orderedIds,
    courts.length,
    restCounts,
  );

  const attempts = tournamentType === "mexicano" ? 40 : 12;
  let bestMatches: EngineMatch[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pool =
      tournamentType === "mexicano" && previousRounds.length > 0
        ? [...playing]
        : shuffleInPlace([...playing]);

    const matches = formMatchesFromPool(pool, courts, partners, opponents);
    const score = scoreCandidateRound(matches, partners, opponents);

    if (score < bestScore) {
      bestScore = score;
      bestMatches = matches;
    }
  }

  if (!bestMatches) {
    throw new Error("Could not generate matches for round");
  }

  // Assign courts in order for stable display
  bestMatches = bestMatches.map((match, index) => ({
    ...match,
    courtId: courts[index % courts.length].id,
  }));

  return {
    index: roundIndex,
    isFinal: false,
    matches: bestMatches,
    restingPlayerIds: resting,
  };
}
