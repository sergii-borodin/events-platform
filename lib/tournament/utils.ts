import type { EngineMatch, EngineRound, PairHistory } from "./types";

export const PLAYERS_PER_COURT = 4;
export const MIN_PLAYERS = 4;

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function clonePlayers<T extends { id: string }>(players: T[]): T[] {
  return players.map((player) => ({ ...player }));
}

export function emptyPairHistory(): PairHistory {
  return new Map();
}

export function getPairCount(
  history: PairHistory,
  a: string,
  b: string,
): number {
  if (a === b) return Number.POSITIVE_INFINITY;
  return history.get(a)?.get(b) ?? 0;
}

export function bumpPair(history: PairHistory, a: string, b: string): void {
  if (a === b) return;

  const ensure = (id: string) => {
    if (!history.has(id)) history.set(id, new Map());
    return history.get(id)!;
  };

  const aMap = ensure(a);
  const bMap = ensure(b);
  aMap.set(b, (aMap.get(b) ?? 0) + 1);
  bMap.set(a, (bMap.get(a) ?? 0) + 1);
}

export function buildHistories(rounds: EngineRound[]): {
  partners: PairHistory;
  opponents: PairHistory;
  restCounts: Map<string, number>;
} {
  const partners = emptyPairHistory();
  const opponents = emptyPairHistory();
  const restCounts = new Map<string, number>();

  for (const round of rounds) {
    for (const playerId of round.restingPlayerIds) {
      restCounts.set(playerId, (restCounts.get(playerId) ?? 0) + 1);
    }

    for (const match of round.matches) {
      recordMatchHistory(match, partners, opponents);
    }
  }

  return { partners, opponents, restCounts };
}

export function recordMatchHistory(
  match: EngineMatch,
  partners: PairHistory,
  opponents: PairHistory,
): void {
  const a = match.teamA.playerIds;
  const b = match.teamB.playerIds;

  if (a.length === 2) bumpPair(partners, a[0], a[1]);
  if (b.length === 2) bumpPair(partners, b[0], b[1]);

  for (const playerA of a) {
    for (const playerB of b) {
      bumpPair(opponents, playerA, playerB);
    }
  }
}

export function pickLeastPlayedWith(
  anchorId: string,
  candidates: string[],
  partners: PairHistory,
): string {
  let best = candidates[0];
  let bestCount = getPairCount(partners, anchorId, best);

  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const count = getPairCount(partners, anchorId, candidate);
    if (
      count < bestCount ||
      (count === bestCount && Math.random() < 0.5)
    ) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

export function pickLeastPlayedAgainst(
  againstIds: string[],
  candidates: string[],
  opponents: PairHistory,
): string {
  let best = candidates[0];
  let bestScore = againstIds.reduce(
    (sum, id) => sum + getPairCount(opponents, id, best),
    0,
  );

  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const score = againstIds.reduce(
      (sum, id) => sum + getPairCount(opponents, id, candidate),
      0,
    );
    if (
      score < bestScore ||
      (score === bestScore && Math.random() < 0.5)
    ) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function takeRandom<T>(items: T[]): [T, T[]] {
  if (items.length === 0) {
    throw new Error("Cannot take from empty list");
  }
  const index = Math.floor(Math.random() * items.length);
  const selected = items[index];
  const remaining = [...items.slice(0, index), ...items.slice(index + 1)];
  return [selected, remaining];
}

export function removeId(ids: string[], id: string): string[] {
  return ids.filter((value) => value !== id);
}
