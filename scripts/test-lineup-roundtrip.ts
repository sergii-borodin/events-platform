import assert from "node:assert/strict";
import {
  buildLineupFieldsFromSnapshots,
  courtsFromLineupFields,
  isRealLineupPlayer,
  lineupSnapshotsToPlayers,
  moveLineupPlayerToCourt,
  swapLineupPlayers,
  toLineupFieldSnapshots,
  type LineupField,
} from "../lib/tournament/lineup";

const fields: LineupField[] = [
  {
    key: "field-a",
    fieldName: "Nykredit",
    players: [
      { key: "1", firstName: "Sergii", lastName: "B", bookingId: "b1" },
      { key: "2", firstName: "Artem", lastName: "" },
      { key: "3", firstName: "Yurii", lastName: "" },
      { key: "4", firstName: "Vova", lastName: "Man" },
    ],
  },
  {
    key: "field-b",
    fieldName: "Sport24",
    players: [
      { key: "5", firstName: "Illya", lastName: "" },
      { key: "6", firstName: "", lastName: "" },
      { key: "7", firstName: "Evan", lastName: "" },
      { key: "8", firstName: "", lastName: "" },
    ],
  },
];

const snapshots = toLineupFieldSnapshots(fields);
assert.equal(snapshots.length, 2);
assert.equal(snapshots[0].name, "Nykredit");
assert.equal(snapshots[0].slots.length, 4);
assert.equal(snapshots[1].slots[1].firstName, "");

const players = lineupSnapshotsToPlayers(snapshots);
assert.equal(players.length, 6);
assert.deepEqual(
  players.map((player) => player.fieldName),
  ["Nykredit", "Nykredit", "Nykredit", "Nykredit", "Sport24", "Sport24"],
);

const rebuilt = buildLineupFieldsFromSnapshots(snapshots, [], 8);
assert.equal(rebuilt.length, 2);
assert.equal(rebuilt[0].fieldName, "Nykredit");
assert.equal(rebuilt[1].fieldName, "Sport24");
assert.equal(rebuilt[0].players[0].firstName, "Sergii");
assert.equal(rebuilt[0].players[0].bookingId, "b1");
assert.equal(rebuilt[1].players[1].firstName, "");
assert.equal(rebuilt[1].players[2].firstName, "Evan");

const courts = courtsFromLineupFields(snapshots);
assert.deepEqual(
  courts.map((court) => court.name),
  ["Nykredit", "Sport24"],
);

const swapped = swapLineupPlayers(fields, 0, 4);
assert.equal(swapped[0].players[0].firstName, "Illya");
assert.equal(swapped[1].players[0].firstName, "Sergii");

const moved = moveLineupPlayerToCourt(fields, 0, 1);
assert.equal(moved[1].players[1].firstName, "Sergii");
assert.equal(isRealLineupPlayer(moved[0].players[0]), false);

console.log("lineup save roundtrip: ok");
