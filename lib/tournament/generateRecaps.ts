import { generateText, Output } from "ai";
import { z } from "zod";

import { renderTemplateRecap } from "./recapTemplates";
import { LLM_FEEDBACK_TONES } from "./tones";
import type { FeedbackTone, PlayerArc, PlayerRecap } from "./types";

const RECAP_MODEL = "openai/gpt-5.4-mini";

const recapElementSchema = z.object({
  playerId: z.string().describe("Exact playerId from the input data"),
  recap: z
    .string()
    .describe("2 short sentences about this player's tournament arc"),
});

function instructionsFor(tone: FeedbackTone): string {
  const shared = [
    "You write end-of-tournament recaps for a padel Americano/Mexicano.",
    "Use only the provided stats. Do not invent scores, partners, or events.",
    "Use each player's exact name.",
    "Mention how their rank changed from the first completed round to the finish when it changed.",
    "No slurs. No comments on bodies, identity, sexuality, gender, or appearance.",
    "Jokes and criticism must be about play: ranking, points, wins, sit-outs, last-match result, partners from the data.",
    "Return one recap per playerId. Keep each recap to 2 sentences (3 max for roast).",
  ].join(" ");

  switch (tone) {
    case "teambuilding":
      return `${shared} Tone: warm, encouraging, group-first. No humiliation. Credit effort and teammates.`;
    case "punchy":
      return `${shared} Tone: witty, light roast, still kind. Short and punchy.`;
    case "roast":
      return `${shared} Tone: adult, rude, funny roast about their play (missed form, collapsing late, lucky wins, sitting out). Still clearly about this tournament's numbers.`;
    default:
      return shared;
  }
}

function compactArcs(arcs: PlayerArc[]) {
  return arcs.map((arc) => ({
    playerId: arc.playerId,
    name: arc.name,
    highlight: arc.highlight,
    firstRank: arc.firstRank,
    finalRank: arc.finalRank,
    rankDelta: arc.rankDelta,
    rankHistory: arc.rankHistory,
    points: arc.points,
    wins: arc.wins,
    matchesPlayed: arc.matchesPlayed,
    restRounds: arc.restRounds,
    biggestWinMargin: arc.biggestWinMargin,
    heaviestLossMargin: arc.heaviestLossMargin,
    lastPlayedWon: arc.lastPlayedWon,
    restedLastRound: arc.restedLastRound,
    favoritePartnerName: arc.favoritePartnerName,
  }));
}

function templateRecaps(arcs: PlayerArc[], tone: FeedbackTone): PlayerRecap[] {
  return arcs.map((arc) => ({
    playerId: arc.playerId,
    text: renderTemplateRecap(arc, tone),
  }));
}

async function generateLlmRecaps(
  arcs: PlayerArc[],
  tone: FeedbackTone,
): Promise<PlayerRecap[]> {
  const { output } = await generateText({
    model: RECAP_MODEL,
    timeout: 40_000,
    maxRetries: 1,
    instructions: instructionsFor(tone),
    output: Output.array({
      name: "playerRecaps",
      description: "A recap for every player in the tournament",
      element: recapElementSchema,
    }),
    prompt: `Write a recap for every player in this JSON:\n${JSON.stringify(compactArcs(arcs))}`,
  });

  if (!output) return [];

  return output
    .map((item) => ({
      playerId: item.playerId,
      text: item.recap.trim(),
    }))
    .filter((item) => item.playerId && item.text);
}

export async function generatePlayerRecaps(
  arcs: PlayerArc[],
  tone: FeedbackTone,
): Promise<PlayerRecap[]> {
  const templates = templateRecaps(arcs, tone);
  if (arcs.length === 0 || !LLM_FEEDBACK_TONES.includes(tone)) {
    return templates;
  }

  try {
    const llmRecaps = await generateLlmRecaps(arcs, tone);
    const byId = new Map(llmRecaps.map((item) => [item.playerId, item.text]));
    return templates.map((item) => ({
      playerId: item.playerId,
      text: byId.get(item.playerId) || item.text,
    }));
  } catch (error) {
    console.error("LLM recaps failed, using templates", error);
    return templates;
  }
}
