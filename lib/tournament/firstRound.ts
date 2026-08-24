import {
  isRealLineupPlayer,
  playerDisplayName,
  type LineupFieldSnapshotInput,
} from "./lineup";
import type {
  EngineCourt,
  EngineMatch,
  EnginePlayer,
  EngineRound,
  StartMode,
} from "./types";
import { PLAYERS_PER_COURT, createId, shuffleInPlace } from "./utils";

export type OpeningRoundPlayer = EnginePlayer & {
  bookingId?: string;
  firstName?: string;
  lastName?: string;
  fieldName?: string;
};

export type OpeningRoundInput = {
  players: OpeningRoundPlayer[];
  courts: EngineCourt[];
  lineupFields?: LineupFieldSnapshotInput[];
  startMode: StartMode;
  roundIndex?: number;
};

function matchName(player: OpeningRoundPlayer, firstName: string, lastName: string) {
  const playerFirst = player.firstName?.trim() ?? "";
  const playerLast = player.lastName?.trim() ?? "";
  if (playerFirst || playerLast) {
    return playerFirst === firstName && playerLast === lastName;
  }
  return player.name.trim() === playerDisplayName(firstName, lastName);
}

export function assignLineupSlotsToPlayers(
  fields: LineupFieldSnapshotInput[],
  players: OpeningRoundPlayer[],
): Array<{ fieldName: string; playerIds: string[] }> {
  const remaining = [...players];

  return fields.map((field) => {
    const fieldName = field.name.trim();
    const playerIds: string[] = [];

    for (const slot of field.slots) {
      if (!isRealLineupPlayer(slot)) continue;

      const firstName = slot.firstName.trim();
      const lastName = slot.lastName.trim();
      const index = remaining.findIndex((player) => {
        if (slot.bookingId) {
          return player.bookingId === slot.bookingId;
        }
        if (player.bookingId) return false;
        if (player.fieldName && fieldName && player.fieldName !== fieldName) {
          return false;
        }
        return matchName(player, firstName, lastName);
      });

      if (index < 0) continue;
      playerIds.push(remaining[index].id);
      remaining.splice(index, 1);
    }

    return { fieldName, playerIds };
  });
}

function matchFromFour(
  playerIds: string[],
  courtId: string,
): EngineMatch {
  return {
    id: createId("match"),
    courtId,
    teamA: { playerIds: [playerIds[0], playerIds[1]], score: null },
    teamB: { playerIds: [playerIds[2], playerIds[3]], score: null },
  };
}

function generateCustomOpeningRound(
  groups: Array<{ playerIds: string[] }>,
  courts: EngineCourt[],
  leftoverIds: string[],
  roundIndex: number,
): EngineRound {
  const matches: EngineMatch[] = [];
  const restingPlayerIds = [...leftoverIds];

  groups.forEach((group, index) => {
    const court = courts[index] ?? courts[index % courts.length];
    if (group.playerIds.length === PLAYERS_PER_COURT && court) {
      matches.push(matchFromFour(group.playerIds, court.id));
      return;
    }
    restingPlayerIds.push(...group.playerIds);
  });

  if (matches.length === 0) {
    throw new Error(
      "Custom start needs at least one court with 4 players. Fill a court or choose random.",
    );
  }

  return {
    index: roundIndex,
    isFinal: false,
    matches,
    restingPlayerIds,
  };
}

function movePlayersOffHomeCourts(
  assignments: string[][],
  homeById: Map<string, number>,
): void {
  if (assignments.length < 2) return;

  for (let court = 0; court < assignments.length; court += 1) {
    for (let slot = 0; slot < assignments[court].length; slot += 1) {
      const playerId = assignments[court][slot];
      if (homeById.get(playerId) !== court) continue;

      const otherCourts = assignments
        .map((_, index) => index)
        .filter((index) => index !== court);
      const otherCourt =
        otherCourts[Math.floor(Math.random() * otherCourts.length)];
      const otherSlot = Math.floor(
        Math.random() * assignments[otherCourt].length,
      );

      assignments[court][slot] = assignments[otherCourt][otherSlot];
      assignments[otherCourt][otherSlot] = playerId;
    }
  }
}

function generateRandomOpeningRound(
  groups: Array<{ playerIds: string[] }>,
  leftoverIds: string[],
  courts: EngineCourt[],
  roundIndex: number,
): EngineRound {
  const seated = groups.flatMap((group, courtIndex) =>
    group.playerIds.map((id) => ({ id, home: courtIndex })),
  );
  const unseated = leftoverIds.map((id) => ({ id, home: -1 }));
  const pool = shuffleInPlace([...seated, ...unseated]);

  const playableCourtCount = Math.min(
    courts.length,
    Math.floor(pool.length / PLAYERS_PER_COURT),
  );
  const playableSlots = playableCourtCount * PLAYERS_PER_COURT;

  if (playableSlots < PLAYERS_PER_COURT) {
    throw new Error("Not enough players or courts to generate a round");
  }

  const playing = pool.slice(0, playableSlots);
  const restingPlayerIds = pool.slice(playableSlots).map((player) => player.id);
  const homeById = new Map(playing.map((player) => [player.id, player.home]));

  const assignments: string[][] = Array.from(
    { length: playableCourtCount },
    () => [],
  );
  playing.forEach((player, index) => {
    assignments[Math.floor(index / PLAYERS_PER_COURT)].push(player.id);
  });

  movePlayersOffHomeCourts(assignments, homeById);
  assignments.forEach((court) => shuffleInPlace(court));

  const matches = assignments.map((playerIds, index) =>
    matchFromFour(playerIds, courts[index].id),
  );

  return {
    index: roundIndex,
    isFinal: false,
    matches,
    restingPlayerIds,
  };
}

export function groupsFromPlayers(
  players: OpeningRoundPlayer[],
  courts: EngineCourt[],
): Array<{ fieldName: string; playerIds: string[] }> {
  const byField = new Map<string, string[]>();
  const unnamed: string[] = [];

  for (const player of players) {
    const fieldName = player.fieldName?.trim();
    if (!fieldName) {
      unnamed.push(player.id);
      continue;
    }
    const list = byField.get(fieldName) ?? [];
    list.push(player.id);
    byField.set(fieldName, list);
  }

  if (byField.size > 0) {
    const groups = Array.from(byField.entries()).map(([fieldName, playerIds]) => ({
      fieldName,
      playerIds,
    }));
    if (unnamed.length > 0) {
      groups.push({ fieldName: "", playerIds: unnamed });
    }
    return groups;
  }

  return courts.map((court, index) => ({
    fieldName: court.name,
    playerIds: players
      .slice(
        index * PLAYERS_PER_COURT,
        index * PLAYERS_PER_COURT + PLAYERS_PER_COURT,
      )
      .map((player) => player.id),
  }));
}

export function generateOpeningRound(input: OpeningRoundInput): EngineRound {
  const {
    players,
    courts,
    lineupFields,
    startMode,
    roundIndex = 0,
  } = input;

  const groups = lineupFields?.length
    ? assignLineupSlotsToPlayers(lineupFields, players)
    : groupsFromPlayers(players, courts);
  const assignedIds = new Set(groups.flatMap((group) => group.playerIds));
  const leftoverIds = players
    .map((player) => player.id)
    .filter((id) => !assignedIds.has(id));

  if (startMode === "custom") {
    return generateCustomOpeningRound(
      groups,
      courts,
      leftoverIds,
      roundIndex,
    );
  }

  return generateRandomOpeningRound(
    groups,
    leftoverIds,
    courts,
    roundIndex,
  );
}
