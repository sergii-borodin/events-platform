"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";

import { Event, Tournament } from "@/database";
import type {
  ITournament,
  ITournamentCourt,
  ITournamentPlayer,
  PointsTo,
  ResultSorting,
  TournamentType,
} from "@/database/tournament.model";
import { getEventParticipants } from "@/lib/actions/booking.actions";
import connectDB from "@/lib/mongodb";
import {
  canStart,
  createId,
  generateRound,
  isRoundComplete,
} from "@/lib/tournament";

export type TournamentDTO = {
  id: string;
  eventId: string;
  slug: string;
  status: ITournament["status"];
  tournamentType: TournamentType;
  pointsTo: PointsTo;
  resultSorting: ResultSorting;
  courts: ITournamentCourt[];
  players: ITournamentPlayer[];
  rounds: ITournament["rounds"];
  currentRoundIndex: number;
};

export type TournamentSettingsInput = {
  tournamentType: TournamentType;
  pointsTo: PointsTo;
  resultSorting: ResultSorting;
  courts: Array<{ name: string }>;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      reason:
        | "not-found"
        | "invalid"
        | "not-enough-players"
        | "round-incomplete"
        | "error";
      message?: string;
    };

const POINTS_TO: PointsTo[] = [11, 16, 21, 24, 32];

function toDTO(doc: {
  _id: unknown;
  eventId: unknown;
  slug: string;
  status: ITournament["status"];
  tournamentType: TournamentType;
  pointsTo: PointsTo;
  resultSorting: ResultSorting;
  courts: ITournamentCourt[];
  players: ITournamentPlayer[];
  rounds: ITournament["rounds"];
  currentRoundIndex: number;
}): TournamentDTO {
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    slug: doc.slug,
    status: doc.status,
    tournamentType: doc.tournamentType,
    pointsTo: doc.pointsTo,
    resultSorting: doc.resultSorting,
    courts: doc.courts,
    players: doc.players,
    rounds: doc.rounds,
    currentRoundIndex: doc.currentRoundIndex,
  };
}

function revalidateTournamentPaths(slug: string) {
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/tournament`);
}

function normalizeCourts(
  courts: Array<{ name: string }>,
): ITournamentCourt[] {
  const cleaned = courts
    .map((court, index) => ({
      id: createId("court"),
      name: court.name.trim() || `Court ${index + 1}`,
    }))
    .filter((court) => court.name.length > 0);

  if (cleaned.length === 0) {
    return [{ id: createId("court"), name: "Court 1" }];
  }

  return cleaned;
}

function validateSettings(
  settings: TournamentSettingsInput,
): string | null {
  if (
    settings.tournamentType !== "americano" &&
    settings.tournamentType !== "mexicano"
  ) {
    return "Invalid tournament type";
  }

  if (!POINTS_TO.includes(settings.pointsTo)) {
    return "Invalid points-to value";
  }

  if (
    settings.resultSorting !== "pointsFirst" &&
    settings.resultSorting !== "winsFirst"
  ) {
    return "Invalid result sorting";
  }

  if (!Array.isArray(settings.courts) || settings.courts.length < 1) {
    return "At least one court is required";
  }

  return null;
}

function snapshotPlayers(
  participants: Array<{ id: string; firstName: string; lastName: string }>,
): ITournamentPlayer[] {
  return participants.map((participant) => {
    const name =
      [participant.firstName, participant.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Participant";

    return {
      id: createId("player"),
      name,
      bookingId: participant.id,
    };
  });
}

export async function getTournamentBySlug(
  slug: string,
): Promise<TournamentDTO | null> {
  try {
    await connectDB();
    const tournament = await Tournament.findOne({ slug }).lean();
    if (!tournament) return null;
    return toDTO(tournament);
  } catch (error) {
    console.error("getTournamentBySlug failed", error);
    return null;
  }
}

export async function getTournamentStatusBySlug(
  slug: string,
): Promise<ITournament["status"] | null> {
  try {
    await connectDB();
    const tournament = await Tournament.findOne({ slug })
      .select("status")
      .lean<{ status: ITournament["status"] } | null>();
    return tournament?.status ?? null;
  } catch {
    return null;
  }
}

export async function createOrUpdateTournamentSetup({
  slug,
  settings,
}: {
  slug: string;
  settings: TournamentSettingsInput;
}): Promise<ActionResult<TournamentDTO>> {
  const settingsError = validateSettings(settings);
  if (settingsError) {
    return { success: false, reason: "invalid", message: settingsError };
  }

  try {
    await connectDB();

    const event = await Event.findOne({ slug }).select("_id").lean();
    if (!event) {
      return { success: false, reason: "not-found" };
    }

    const participants = await getEventParticipants(String(event._id));
    if (participants.length < 4) {
      return {
        success: false,
        reason: "not-enough-players",
        message: "Need at least 4 signed-up players to start a tournament.",
      };
    }

    const courts = normalizeCourts(settings.courts);
    if (!canStart(participants.length, courts.length)) {
      return {
        success: false,
        reason: "not-enough-players",
        message: "Not enough players for the selected courts.",
      };
    }

    const players = snapshotPlayers(participants);

    const existing = await Tournament.findOne({ slug });

    if (existing && existing.status !== "setup") {
      return {
        success: false,
        reason: "invalid",
        message: "Tournament already started. Reset it to change setup.",
      };
    }

    const payload = {
      eventId: new Types.ObjectId(String(event._id)),
      slug,
      status: "setup" as const,
      tournamentType: settings.tournamentType,
      pointsTo: settings.pointsTo,
      resultSorting: settings.resultSorting,
      courts,
      players,
      rounds: [],
      currentRoundIndex: 0,
    };

    const tournament = existing
      ? await Tournament.findOneAndUpdate({ slug }, payload, {
          new: true,
          runValidators: true,
        })
      : await Tournament.create(payload);

    if (!tournament) {
      return { success: false, reason: "error" };
    }

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("createOrUpdateTournamentSetup failed", error);
    return { success: false, reason: "error" };
  }
}

export async function startTournament(
  slug: string,
): Promise<ActionResult<TournamentDTO>> {
  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    if (tournament.status === "playing") {
      return { success: true, data: toDTO(tournament.toObject()) };
    }

    if (tournament.status === "finished") {
      return {
        success: false,
        reason: "invalid",
        message: "Tournament is finished. Reset to start a new one.",
      };
    }

    if (!canStart(tournament.players.length, tournament.courts.length)) {
      return { success: false, reason: "not-enough-players" };
    }

    const round = generateRound({
      players: tournament.players,
      courts: tournament.courts,
      previousRounds: [],
      tournamentType: tournament.tournamentType,
      resultSorting: tournament.resultSorting,
      roundIndex: 0,
    });

    tournament.status = "playing";
    tournament.rounds = [round];
    tournament.currentRoundIndex = 0;
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("startTournament failed", error);
    return { success: false, reason: "error" };
  }
}

export async function setMatchScore({
  slug,
  roundIndex,
  matchId,
  teamAScore,
  teamBScore,
}: {
  slug: string;
  roundIndex: number;
  matchId: string;
  teamAScore: number;
  teamBScore: number;
}): Promise<ActionResult<TournamentDTO>> {
  if (
    !Number.isInteger(teamAScore) ||
    !Number.isInteger(teamBScore) ||
    teamAScore < 0 ||
    teamBScore < 0
  ) {
    return {
      success: false,
      reason: "invalid",
      message: "Scores must be non-negative integers.",
    };
  }

  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    if (tournament.status !== "playing") {
      return {
        success: false,
        reason: "invalid",
        message: "Tournament is not in playing state.",
      };
    }

    const round = tournament.rounds[roundIndex];
    if (!round) {
      return { success: false, reason: "not-found" };
    }

    const match = round.matches.find((item) => item.id === matchId);
    if (!match) {
      return { success: false, reason: "not-found" };
    }

    if (teamAScore + teamBScore !== tournament.pointsTo) {
      return {
        success: false,
        reason: "invalid",
        message: `Scores must add up to ${tournament.pointsTo}.`,
      };
    }

    match.teamA.score = teamAScore;
    match.teamB.score = teamBScore;
    tournament.markModified("rounds");
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("setMatchScore failed", error);
    return { success: false, reason: "error" };
  }
}

export async function generateNextRound(
  slug: string,
): Promise<ActionResult<TournamentDTO>> {
  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    if (tournament.status !== "playing") {
      return { success: false, reason: "invalid" };
    }

    const current = tournament.rounds[tournament.currentRoundIndex];
    if (!isRoundComplete(current)) {
      return {
        success: false,
        reason: "round-incomplete",
        message: "Enter all scores before generating the next round.",
      };
    }

    if (current?.isFinal) {
      return {
        success: false,
        reason: "invalid",
        message: "Final round already played. Go to standings.",
      };
    }

    const nextIndex = tournament.rounds.length;
    const round = generateRound({
      players: tournament.players,
      courts: tournament.courts,
      previousRounds: tournament.rounds,
      tournamentType: tournament.tournamentType,
      resultSorting: tournament.resultSorting,
      roundIndex: nextIndex,
    });

    tournament.rounds.push(round);
    tournament.currentRoundIndex = nextIndex;
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("generateNextRound failed", error);
    return { success: false, reason: "error" };
  }
}

export async function generateFinalRound(
  slug: string,
): Promise<ActionResult<TournamentDTO>> {
  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    if (tournament.status !== "playing") {
      return { success: false, reason: "invalid" };
    }

    if (tournament.rounds.length < 1) {
      return {
        success: false,
        reason: "invalid",
        message: "Play at least one round before the final.",
      };
    }

    const current = tournament.rounds[tournament.currentRoundIndex];
    if (!isRoundComplete(current)) {
      return {
        success: false,
        reason: "round-incomplete",
        message: "Enter all scores before generating the final.",
      };
    }

    if (current?.isFinal || tournament.rounds.some((round) => round.isFinal)) {
      return {
        success: false,
        reason: "invalid",
        message: "Final round already exists.",
      };
    }

    const nextIndex = tournament.rounds.length;
    const round = generateRound({
      players: tournament.players,
      courts: tournament.courts,
      previousRounds: tournament.rounds,
      tournamentType: tournament.tournamentType,
      resultSorting: tournament.resultSorting,
      isFinal: true,
      roundIndex: nextIndex,
    });

    tournament.rounds.push(round);
    tournament.currentRoundIndex = nextIndex;
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("generateFinalRound failed", error);
    return { success: false, reason: "error" };
  }
}

export async function finishTournament(
  slug: string,
): Promise<ActionResult<TournamentDTO>> {
  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    const current = tournament.rounds[tournament.currentRoundIndex];
    if (tournament.rounds.length > 0 && !isRoundComplete(current)) {
      return {
        success: false,
        reason: "round-incomplete",
        message: "Enter all scores before finishing.",
      };
    }

    tournament.status = "finished";
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("finishTournament failed", error);
    return { success: false, reason: "error" };
  }
}

export async function goToRound({
  slug,
  roundIndex,
}: {
  slug: string;
  roundIndex: number;
}): Promise<ActionResult<TournamentDTO>> {
  try {
    await connectDB();

    const tournament = await Tournament.findOne({ slug });
    if (!tournament) {
      return { success: false, reason: "not-found" };
    }

    if (
      roundIndex < 0 ||
      roundIndex >= tournament.rounds.length ||
      !Number.isInteger(roundIndex)
    ) {
      return { success: false, reason: "invalid" };
    }

    tournament.currentRoundIndex = roundIndex;
    await tournament.save();

    revalidateTournamentPaths(slug);
    return { success: true, data: toDTO(tournament.toObject()) };
  } catch (error) {
    console.error("goToRound failed", error);
    return { success: false, reason: "error" };
  }
}

export async function resetTournament(
  slug: string,
): Promise<ActionResult<null>> {
  try {
    await connectDB();

    const deleted = await Tournament.findOneAndDelete({ slug });
    if (!deleted) {
      return { success: false, reason: "not-found" };
    }

    revalidateTournamentPaths(slug);
    return { success: true, data: null };
  } catch (error) {
    console.error("resetTournament failed", error);
    return { success: false, reason: "error" };
  }
}
