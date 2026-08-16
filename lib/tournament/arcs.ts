import { computeStandings, isRoundComplete } from "./standings";
import type {
  EnginePlayer,
  EngineRound,
  PlayerArc,
  PlayerHighlight,
  ResultSorting,
} from "./types";

type MatchStats = {
  restRounds: number;
  biggestWinMargin: number | null;
  heaviestLossMargin: number | null;
  lastPlayedWon: boolean | null;
  partnerCounts: Map<string, number>;
};

function emptyStats(): MatchStats {
  return {
    restRounds: 0,
    biggestWinMargin: null,
    heaviestLossMargin: null,
    lastPlayedWon: null,
    partnerCounts: new Map(),
  };
}

function pickHighlight(
  finalRank: number,
  rankDelta: number,
): PlayerHighlight {
  if (finalRank === 1) return "champion";
  if (rankDelta >= 2) return "comeback";
  if (rankDelta <= -2) return "faded";
  if (Math.abs(rankDelta) <= 1) return "consistent";
  return "wildcard";
}

function favoritePartnerId(partnerCounts: Map<string, number>): string | null {
  let bestId: string | null = null;
  let bestCount = 0;

  for (const [partnerId, count] of partnerCounts) {
    if (count > bestCount) {
      bestId = partnerId;
      bestCount = count;
    }
  }

  return bestId;
}

export function computePlayerArcs(
  players: EnginePlayer[],
  rounds: EngineRound[],
  resultSorting: ResultSorting = "pointsFirst",
): PlayerArc[] {
  const completed = rounds.filter(isRoundComplete);
  const nameById = new Map(players.map((player) => [player.id, player.name]));
  const statsById = new Map(players.map((player) => [player.id, emptyStats()]));

  const snapshots = completed.map((_, index) =>
    computeStandings(players, completed.slice(0, index + 1), resultSorting),
  );
  const finalStandings =
    snapshots.at(-1) ?? computeStandings(players, [], resultSorting);
  const firstStandings = snapshots[0] ?? finalStandings;
  const firstRankById = new Map(
    firstStandings.map((row) => [row.playerId, row.rank]),
  );
  const rankHistoryById = new Map<string, number[]>();

  for (const snapshot of snapshots) {
    for (const row of snapshot) {
      const history = rankHistoryById.get(row.playerId) ?? [];
      history.push(row.rank);
      rankHistoryById.set(row.playerId, history);
    }
  }

  for (const round of completed) {
    for (const playerId of round.restingPlayerIds) {
      const stats = statsById.get(playerId);
      if (stats) stats.restRounds += 1;
    }

    for (const match of round.matches) {
      const scoreA = match.teamA.score;
      const scoreB = match.teamB.score;
      if (scoreA === null || scoreB === null) continue;

      const applyTeam = (
        playerIds: string[],
        ownScore: number,
        opponentScore: number,
      ) => {
        const margin = ownScore - opponentScore;
        const won = margin > 0;

        for (const playerId of playerIds) {
          const stats = statsById.get(playerId);
          if (!stats) continue;

          stats.lastPlayedWon = won;
          if (margin > 0) {
            stats.biggestWinMargin = Math.max(
              stats.biggestWinMargin ?? 0,
              margin,
            );
          }
          if (margin < 0) {
            stats.heaviestLossMargin = Math.max(
              stats.heaviestLossMargin ?? 0,
              -margin,
            );
          }

          for (const partnerId of playerIds) {
            if (partnerId === playerId) continue;
            stats.partnerCounts.set(
              partnerId,
              (stats.partnerCounts.get(partnerId) ?? 0) + 1,
            );
          }
        }
      };

      applyTeam(match.teamA.playerIds, scoreA, scoreB);
      applyTeam(match.teamB.playerIds, scoreB, scoreA);
    }
  }

  const lastRound = completed.at(-1);

  return finalStandings.map((row) => {
    const stats = statsById.get(row.playerId) ?? emptyStats();
    const firstRank = firstRankById.get(row.playerId) ?? row.rank;
    const rankDelta = firstRank - row.rank;
    const partnerId = favoritePartnerId(stats.partnerCounts);

    return {
      playerId: row.playerId,
      name: row.name,
      finalRank: row.rank,
      firstRank,
      rankDelta,
      rankHistory: rankHistoryById.get(row.playerId) ?? [],
      points: row.points,
      wins: row.wins,
      matchesPlayed: row.matchesPlayed,
      restRounds: stats.restRounds,
      biggestWinMargin: stats.biggestWinMargin,
      heaviestLossMargin: stats.heaviestLossMargin,
      lastPlayedWon: stats.lastPlayedWon,
      restedLastRound: lastRound
        ? lastRound.restingPlayerIds.includes(row.playerId)
        : false,
      favoritePartnerName: partnerId
        ? (nameById.get(partnerId) ?? null)
        : null,
      highlight: pickHighlight(row.rank, rankDelta),
    };
  });
}
