import type { FeedbackTone, PlayerHighlight } from "./types";

export const FEEDBACK_TONES: FeedbackTone[] = [
  "formal",
  "neutral",
  "teambuilding",
  "punchy",
  "roast",
];

export const FEEDBACK_TONE_OPTIONS: Array<{
  id: FeedbackTone;
  label: string;
  hint: string;
}> = [
  {
    id: "formal",
    label: "Formal",
    hint: "Chief or colleagues",
  },
  {
    id: "neutral",
    label: "Neutral",
    hint: "Just the facts",
  },
  {
    id: "teambuilding",
    label: "Teambuilding",
    hint: "Encouraging, group-first",
  },
  {
    id: "punchy",
    label: "Punchy",
    hint: "Light roast for mates",
  },
  {
    id: "roast",
    label: "Roast",
    hint: "18+, confirm everyone is OK with this",
  },
];

export const PLAYER_HIGHLIGHT_LABELS: Record<PlayerHighlight, string> = {
  champion: "Champion",
  comeback: "Comeback",
  faded: "Faded",
  consistent: "Steady",
  wildcard: "Wildcard",
};

export const LLM_FEEDBACK_TONES: FeedbackTone[] = [
  "teambuilding",
  "punchy",
  "roast",
];

export function isFeedbackTone(value: unknown): value is FeedbackTone {
  return (
    typeof value === "string" &&
    (FEEDBACK_TONES as readonly string[]).includes(value)
  );
}
