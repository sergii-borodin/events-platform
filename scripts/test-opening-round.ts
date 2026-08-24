import assert from "node:assert/strict";
import { generateOpeningRound } from "../lib/tournament/firstRound";
import type { LineupFieldSnapshotInput } from "../lib/tournament/lineup";

const lineupFields: LineupFieldSnapshotInput[] = [
  {
    name: "Nykredit",
    slots: [
      { firstName: "Sergii", lastName: "B", bookingId: "b1" },
      { firstName: "Artem", lastName: "", bookingId: "b2" },
      { firstName: "Yurii", lastName: "", bookingId: "b3" },
      { firstName: "Vova", lastName: "Man", bookingId: "b4" },
    ],
  },
  {
    name: "Sport24",
    slots: [
      { firstName: "Illya", lastName: "", bookingId: "b5" },
      { firstName: "Evan", lastName: "", bookingId: "b6" },
      { firstName: "Pavlo", lastName: "", bookingId: "b7" },
      { firstName: "Anna", lastName: "", bookingId: "b8" },
    ],
  },
];

const players = lineupFields.flatMap((field, fieldIndex) =>
  field.slots.map((slot, slotIndex) => ({
    id: `p${fieldIndex * 4 + slotIndex + 1}`,
    name: [slot.firstName, slot.lastName].filter(Boolean).join(" "),
    firstName: slot.firstName,
    lastName: slot.lastName,
    bookingId: slot.bookingId,
    fieldName: field.name,
  })),
);

const courts = [
  { id: "court-nykredit", name: "Nykredit" },
  { id: "court-sport24", name: "Sport24" },
];

const custom = generateOpeningRound({
  players,
  courts,
  lineupFields,
  startMode: "custom",
});

assert.equal(custom.matches.length, 2);
assert.deepEqual(custom.matches[0].teamA.playerIds, ["p1", "p2"]);
assert.deepEqual(custom.matches[0].teamB.playerIds, ["p3", "p4"]);
assert.equal(custom.matches[0].courtId, "court-nykredit");
assert.deepEqual(custom.matches[1].teamA.playerIds, ["p5", "p6"]);
assert.deepEqual(custom.matches[1].teamB.playerIds, ["p7", "p8"]);
assert.equal(custom.restingPlayerIds.length, 0);

const random = generateOpeningRound({
  players,
  courts,
  lineupFields,
  startMode: "random",
});

assert.equal(random.matches.length, 2);
const randomIds = random.matches.flatMap((match) => [
  ...match.teamA.playerIds,
  ...match.teamB.playerIds,
]);
assert.equal(new Set(randomIds).size, 8);
assert.equal(random.restingPlayerIds.length, 0);

const incomplete = generateOpeningRound({
  players: players.slice(0, 6),
  courts,
  lineupFields: [
    lineupFields[0],
    {
      name: "Sport24",
      slots: [
        { firstName: "Illya", lastName: "", bookingId: "b5" },
        { firstName: "Evan", lastName: "", bookingId: "b6" },
        { firstName: "", lastName: "" },
        { firstName: "", lastName: "" },
      ],
    },
  ],
  startMode: "custom",
});

assert.equal(incomplete.matches.length, 1);
assert.equal(incomplete.matches[0].courtId, "court-nykredit");
assert.deepEqual(incomplete.restingPlayerIds.sort(), ["p5", "p6"]);

console.log("opening round: ok");
