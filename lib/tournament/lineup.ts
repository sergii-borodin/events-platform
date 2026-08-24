import { createId, PLAYERS_PER_COURT } from "@/lib/tournament/utils";

type NamedParticipant = {
  id: string;
  firstName: string;
  lastName: string;
};

export type LineupPlayerInput = {
  firstName: string;
  lastName: string;
  fieldName?: string;
  bookingId?: string;
};

export type LineupStoredPlayer = {
  id?: string;
  name: string;
  bookingId?: string;
  firstName?: string;
  lastName?: string;
  fieldName?: string;
};

export type LineupRow = {
  key: string;
  firstName: string;
  lastName: string;
  bookingId?: string;
};

export type LineupField = {
  key: string;
  fieldName: string;
  players: LineupRow[];
};

export function playerDisplayName(
  firstName: string,
  lastName: string,
): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Participant";
}

export function splitStoredPlayerName(player: {
  name: string;
  firstName?: string;
  lastName?: string;
}): { firstName: string; lastName: string } {
  const firstName = player.firstName?.trim() ?? "";
  const lastName = player.lastName?.trim() ?? "";

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const parts = player.name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function snapshotPlayers(
  participants: NamedParticipant[],
): Array<
  Required<
    Pick<LineupStoredPlayer, "id" | "name" | "firstName" | "lastName">
  > & { bookingId: string; fieldName?: string }
> {
  return participants.map((participant) => {
    const firstName = participant.firstName.trim();
    const lastName = participant.lastName.trim();

    return {
      id: createId("player"),
      name: playerDisplayName(firstName, lastName),
      firstName,
      lastName,
      bookingId: participant.id,
    };
  });
}

export function mergeLineupWithBookings(
  participants: NamedParticipant[],
  savedPlayers?: LineupStoredPlayer[],
): Array<
  Required<Pick<LineupStoredPlayer, "id" | "name" | "firstName" | "lastName">> & {
    bookingId?: string;
    fieldName?: string;
  }
> {
  if (!savedPlayers?.length) {
    return snapshotPlayers(participants);
  }

  const bookingsById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const usedBookingIds = new Set<string>();
  const players: Array<
    Required<
      Pick<LineupStoredPlayer, "id" | "name" | "firstName" | "lastName">
    > & { bookingId?: string; fieldName?: string }
  > = [];

  for (const saved of savedPlayers) {
    const fieldName = saved.fieldName?.trim() || undefined;

    if (saved.bookingId) {
      const booking = bookingsById.get(saved.bookingId);
      if (!booking) continue;

      usedBookingIds.add(saved.bookingId);
      const firstName = saved.firstName?.trim() || booking.firstName.trim();
      const lastName = saved.lastName?.trim() || booking.lastName.trim();

      players.push({
        id: saved.id || createId("player"),
        name: playerDisplayName(firstName, lastName),
        firstName,
        lastName,
        fieldName,
        bookingId: saved.bookingId,
      });
      continue;
    }

    const names = splitStoredPlayerName(saved);
    if (!names.firstName && !names.lastName && !fieldName) continue;

    players.push({
      id: saved.id || createId("player"),
      name: playerDisplayName(names.firstName, names.lastName),
      firstName: names.firstName,
      lastName: names.lastName,
      fieldName,
    });
  }

  for (const participant of participants) {
    if (usedBookingIds.has(participant.id)) continue;
    players.push(...snapshotPlayers([participant]));
  }

  return players;
}

function newRowKey(): string {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

function newFieldKey(): string {
  return `field-${Math.random().toString(36).slice(2, 10)}`;
}

export function isRealLineupPlayer(player: {
  firstName?: string;
  lastName?: string;
  bookingId?: string;
}): boolean {
  return Boolean(
    player.bookingId || player.firstName?.trim() || player.lastName?.trim(),
  );
}

export function createEmptyLineupRow(): LineupRow {
  return {
    key: newRowKey(),
    firstName: "",
    lastName: "",
  };
}

export function createEmptyLineupField(fieldName = ""): LineupField {
  return {
    key: newFieldKey(),
    fieldName,
    players: Array.from({ length: PLAYERS_PER_COURT }, () =>
      createEmptyLineupRow(),
    ),
  };
}

function padFieldPlayers(players: LineupRow[]): LineupRow[] {
  const next = [...players];
  while (next.length < PLAYERS_PER_COURT) {
    next.push(createEmptyLineupRow());
  }
  return next.slice(0, PLAYERS_PER_COURT);
}

export function buildLineupFields(
  participants: NamedParticipant[],
  savedPlayers: LineupStoredPlayer[] | undefined,
  maxParticipants: number,
): LineupField[] {
  const merged = mergeLineupWithBookings(participants, savedPlayers);
  const fields: LineupField[] = [];
  let current: LineupField | null = null;

  for (const player of merged) {
    const names = splitStoredPlayerName(player);
    const fieldName = player.fieldName?.trim() ?? "";
    const row: LineupRow = {
      key: player.id,
      firstName: names.firstName,
      lastName: names.lastName,
      bookingId: player.bookingId,
    };

    const fieldChanged =
      current !== null &&
      current.fieldName.length > 0 &&
      fieldName.length > 0 &&
      current.fieldName !== fieldName;

    if (
      !current ||
      current.players.length >= PLAYERS_PER_COURT ||
      fieldChanged
    ) {
      current = {
        key: newFieldKey(),
        fieldName,
        players: [],
      };
      fields.push(current);
    } else if (fieldName && !current.fieldName) {
      current.fieldName = fieldName;
    }

    current.players.push(row);
  }

  const neededFields = Math.max(
    fields.length,
    Math.ceil(Math.max(maxParticipants, 1) / PLAYERS_PER_COURT),
    1,
  );

  while (fields.length < neededFields) {
    fields.push(createEmptyLineupField());
  }

  return fields.map((field) => ({
    ...field,
    players: padFieldPlayers(field.players),
  }));
}

export function flattenLineupFields(
  fields: LineupField[],
): LineupPlayerInput[] {
  return fields.flatMap((field) =>
    field.players.map((player) => ({
      firstName: player.firstName,
      lastName: player.lastName,
      fieldName: field.fieldName.trim() || undefined,
      bookingId: player.bookingId || undefined,
    })),
  );
}

export type LineupFieldSnapshotInput = {
  name: string;
  slots: Array<{
    firstName: string;
    lastName: string;
    bookingId?: string;
  }>;
};

export function toLineupFieldSnapshots(
  fields: LineupField[],
): LineupFieldSnapshotInput[] {
  return fields.map((field) => ({
    name: field.fieldName.trim(),
    slots: padFieldPlayers(field.players).map((player) => {
      const slot: LineupFieldSnapshotInput["slots"][number] = {
        firstName: player.firstName.trim(),
        lastName: player.lastName.trim(),
      };
      if (player.bookingId) {
        slot.bookingId = player.bookingId;
      }
      return slot;
    }),
  }));
}

export function courtsFromLineupFields(
  fields?: Array<{
    name?: string;
    slots?: Array<{
      firstName?: string;
      lastName?: string;
      bookingId?: string;
    }>;
  }>,
): Array<{ name: string }> {
  if (!fields?.length) return [];

  return fields
    .filter(
      (field) =>
        Boolean(field.name?.trim()) ||
        Boolean(field.slots?.some((slot) => isRealLineupPlayer(slot))),
    )
    .map((field, index) => ({
      name: field.name?.trim() || `Court ${index + 1}`,
    }));
}

export function lineupSnapshotsToPlayers(
  fields: LineupFieldSnapshotInput[],
): Array<
  Required<Pick<LineupStoredPlayer, "id" | "name" | "firstName" | "lastName">> & {
    bookingId?: string;
    fieldName?: string;
  }
> {
  return fields.flatMap((field) =>
    field.slots
      .filter((slot) => isRealLineupPlayer(slot))
      .map((slot) => {
        const firstName = slot.firstName.trim();
        const lastName = slot.lastName.trim();
        return {
          id: createId("player"),
          name: playerDisplayName(firstName, lastName),
          firstName,
          lastName,
          fieldName: field.name.trim() || undefined,
          bookingId: slot.bookingId || undefined,
        };
      }),
  );
}

export function buildLineupFieldsFromSnapshots(
  snapshots: LineupFieldSnapshotInput[] | undefined,
  participants: NamedParticipant[],
  maxParticipants: number,
): LineupField[] {
  if (!snapshots?.length) {
    return buildLineupFields(participants, undefined, maxParticipants);
  }

  const usedBookingIds = new Set<string>();
  const fields: LineupField[] = snapshots.map((snapshot) => {
    const players = padFieldPlayers(
      snapshot.slots.map((slot) => {
        if (slot.bookingId) usedBookingIds.add(slot.bookingId);
        return {
          key: newRowKey(),
          firstName: slot.firstName,
          lastName: slot.lastName,
          bookingId: slot.bookingId || undefined,
        };
      }),
    );

    return {
      key: newFieldKey(),
      fieldName: snapshot.name,
      players,
    };
  });

  const unused = participants.filter(
    (participant) => !usedBookingIds.has(participant.id),
  );

  for (const participant of unused) {
    const emptySlot = fields
      .flatMap((field, fieldIndex) =>
        field.players.map((player, playerIndex) => ({
          fieldIndex,
          playerIndex,
          player,
        })),
      )
      .find(({ player }) => !isRealLineupPlayer(player));

    if (emptySlot) {
      fields[emptySlot.fieldIndex].players[emptySlot.playerIndex] = {
        key: newRowKey(),
        firstName: participant.firstName,
        lastName: participant.lastName,
        bookingId: participant.id,
      };
      continue;
    }

    const extra = createEmptyLineupField();
    extra.players[0] = {
      key: newRowKey(),
      firstName: participant.firstName,
      lastName: participant.lastName,
      bookingId: participant.id,
    };
    fields.push(extra);
  }

  return fields;
}

export function swapLineupPlayers(
  fields: LineupField[],
  fromIndex: number,
  toIndex: number,
): LineupField[] {
  if (fromIndex === toIndex) return fields;

  const slots = fields.flatMap((field) => field.players);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slots.length ||
    toIndex >= slots.length
  ) {
    return fields;
  }

  const nextSlots = [...slots];
  const moved = nextSlots[fromIndex];
  nextSlots[fromIndex] = nextSlots[toIndex];
  nextSlots[toIndex] = moved;

  return fields.map((field, fieldIndex) => {
    const start = fieldIndex * PLAYERS_PER_COURT;
    return {
      ...field,
      players: nextSlots.slice(start, start + PLAYERS_PER_COURT),
    };
  });
}

export function moveLineupPlayerToCourt(
  fields: LineupField[],
  fromIndex: number,
  courtIndex: number,
): LineupField[] {
  if (courtIndex < 0 || courtIndex >= fields.length) return fields;

  const fromCourt = Math.floor(fromIndex / PLAYERS_PER_COURT);
  if (fromCourt === courtIndex) return fields;

  const emptyOffset = fields[courtIndex].players.findIndex(
    (player) => !isRealLineupPlayer(player),
  );
  if (emptyOffset < 0) return fields;

  return swapLineupPlayers(
    fields,
    fromIndex,
    courtIndex * PLAYERS_PER_COURT + emptyOffset,
  );
}
