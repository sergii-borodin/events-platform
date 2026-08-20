import type {
  EnginePlayer,
  EngineRound,
  ResultSorting,
  StandingRow,
} from "./types";

export type AppliedMatchScore = {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
};

export function applyMatchScoresToRound(
  round: EngineRound,
  scores: AppliedMatchScore[],
): EngineRound {
  const byId = new Map(scores.map((score) => [score.matchId, score]));

  return {
    ...round,
    matches: round.matches.map((match) => {
      const score = byId.get(match.id);
      if (!score) return match;

      return {
        ...match,
        teamA: { ...match.teamA, score: score.teamAScore },
        teamB: { ...match.teamB, score: score.teamBScore },
      };
    }),
  };
}

export function computeStandingsBeforeAndAfter(
  players: EnginePlayer[],
  rounds: EngineRound[],
  currentRoundIndex: number,
  scores: AppliedMatchScore[],
  resultSorting: ResultSorting = "pointsFirst",
): { previous: StandingRow[]; next: StandingRow[] } {
  const previousRounds = rounds.slice(0, currentRoundIndex);
  const previous = computeStandings(players, previousRounds, resultSorting);

  const current = rounds[currentRoundIndex];
  if (!current) {
    return { previous, next: previous };
  }

  const next = computeStandings(
    players,
    [...previousRounds, applyMatchScoresToRound(current, scores)],
    resultSorting,
  );

  return { previous, next };
}

export function isRoundComplete(round: EngineRound | undefined): boolean {
  if (!round) return false;
  return round.matches.every(
    (match) => match.teamA.score !== null && match.teamB.score !== null,
  );
}

export function computeStandings(
  players: EnginePlayer[],
  rounds: EngineRound[],
  resultSorting: ResultSorting = "pointsFirst",
): StandingRow[] {
  const byId = new Map<
    string,
    { points: number; wins: number; matchesPlayed: number }
  >();

  for (const player of players) {
    byId.set(player.id, { points: 0, wins: 0, matchesPlayed: 0 });
  }

  for (const round of rounds) {
    for (const match of round.matches) {
      const scoreA = match.teamA.score;
      const scoreB = match.teamB.score;
      if (scoreA === null || scoreB === null) continue;

      const teamAWon = scoreA > scoreB;
      const teamBWon = scoreB > scoreA;

      for (const playerId of match.teamA.playerIds) {
        const row = byId.get(playerId);
        if (!row) continue;
        row.points += scoreA;
        row.matchesPlayed += 1;
        if (teamAWon) row.wins += 1;
      }

      for (const playerId of match.teamB.playerIds) {
        const row = byId.get(playerId);
        if (!row) continue;
        row.points += scoreB;
        row.matchesPlayed += 1;
        if (teamBWon) row.wins += 1;
      }
    }
  }

  const rows: StandingRow[] = players.map((player) => {
    const stats = byId.get(player.id) ?? {
      points: 0,
      wins: 0,
      matchesPlayed: 0,
    };
    return {
      playerId: player.id,
      name: player.name,
      points: stats.points,
      wins: stats.wins,
      matchesPlayed: stats.matchesPlayed,
      rank: 0,
    };
  });

  rows.sort((a, b) => {
    if (resultSorting === "winsFirst") {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    }

    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}
