import { ordinal } from "./utils";
import type { FeedbackTone, PlayerArc } from "./types";

function trajectory(arc: PlayerArc): string {
  if (arc.rankHistory.length < 2 || arc.firstRank === arc.finalRank) {
    return `finished ${ordinal(arc.finalRank)}`;
  }
  if (arc.rankDelta > 0) {
    return `moved from ${ordinal(arc.firstRank)} to ${ordinal(arc.finalRank)}`;
  }
  return `dropped from ${ordinal(arc.firstRank)} to ${ordinal(arc.finalRank)}`;
}

function statsLine(arc: PlayerArc): string {
  const winLabel = arc.wins === 1 ? "win" : "wins";
  const matchLabel = arc.matchesPlayed === 1 ? "match" : "matches";
  return `${arc.points} points, ${arc.wins} ${winLabel}, ${arc.matchesPlayed} ${matchLabel}`;
}

function extras(arc: PlayerArc): string {
  const bits: string[] = [];
  if (arc.favoritePartnerName) {
    bits.push(`Most frequent partner: ${arc.favoritePartnerName}.`);
  }
  if (arc.restRounds > 0) {
    bits.push(
      `Sat out ${arc.restRounds} round${arc.restRounds === 1 ? "" : "s"}.`,
    );
  }
  return bits.join(" ");
}

function joinSentences(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function formalRecap(arc: PlayerArc): string {
  if (arc.highlight === "champion") {
    const start =
      arc.firstRank === arc.finalRank
        ? `${arc.name} finished first, recording ${statsLine(arc)}.`
        : `${arc.name} finished first after starting ${ordinal(arc.firstRank)}, recording ${statsLine(arc)}.`;
    return joinSentences(start, extras(arc));
  }
  return joinSentences(
    `${arc.name} ${trajectory(arc)}, recording ${statsLine(arc)}.`,
    extras(arc),
  );
}

function neutralRecap(arc: PlayerArc): string {
  const start =
    arc.firstRank === arc.finalRank
      ? ordinal(arc.finalRank)
      : `${ordinal(arc.finalRank)} (started ${ordinal(arc.firstRank)})`;
  return joinSentences(
    `${arc.name} — ${start}. ${statsLine(arc)}.`,
    extras(arc),
  );
}

function teambuildingRecap(arc: PlayerArc): string {
  const partner = arc.favoritePartnerName
    ? ` Strong pairing with ${arc.favoritePartnerName}.`
    : "";
  switch (arc.highlight) {
    case "champion":
      return `${arc.name} set the standard for the group and ${trajectory(arc)} with ${statsLine(arc)}.${partner}`;
    case "comeback":
      return `${arc.name} kept showing up and ${trajectory(arc)} — ${statsLine(arc)}. That climb lifted the session.${partner}`;
    case "faded":
      return `${arc.name} ${trajectory(arc)} (${statsLine(arc)}), but stayed in the mix and kept the courts full.${partner}`;
    case "consistent":
      return `${arc.name} was a steady presence, ${trajectory(arc)} with ${statsLine(arc)}. Reliable teammates make the day work.${partner}`;
    default:
      return `${arc.name} ${trajectory(arc)} with ${statsLine(arc)}. A useful, competitive part of the group.${partner}`;
  }
}

function punchyRecap(arc: PlayerArc): string {
  const last =
    arc.lastPlayedWon === false
      ? " The last match did not cooperate."
      : arc.lastPlayedWon
        ? " Closed on a win."
        : "";
  switch (arc.highlight) {
    case "champion":
      return `${arc.name} took the table after ${trajectory(arc)} — ${statsLine(arc)}. Arguments later.${last}`;
    case "comeback":
      return `${arc.name} ${trajectory(arc)} and made it look planned. ${statsLine(arc)}.${last}`;
    case "faded":
      return `${arc.name} ${trajectory(arc)}. ${statsLine(arc)} — the start of the day wants a word.${last}`;
    case "consistent":
      return `${arc.name} barely moved: ${trajectory(arc)}, ${statsLine(arc)}. Reliable, slightly annoying.${last}`;
    default:
      return `${arc.name} ${trajectory(arc)} with ${statsLine(arc)}. A chaotic subplot, as requested.${last}`;
  }
}

function roastRecap(arc: PlayerArc): string {
  const rest =
    arc.restRounds > 0
      ? ` Also found ${arc.restRounds} round${arc.restRounds === 1 ? "" : "s"} to sit out, which tracks.`
      : "";
  const loss =
    arc.heaviestLossMargin != null
      ? ` Ate a ${arc.heaviestLossMargin}-point beating somewhere in there.`
      : "";
  switch (arc.highlight) {
    case "champion":
      return `${arc.name} finished first (${statsLine(arc)}). Either a clinic or everyone else had an off day. The ladder does not care.${rest}`;
    case "comeback":
      return `${arc.name} ${trajectory(arc)}. Started like a warm-up, ended like they remembered the scoreboard exists. ${statsLine(arc)}.${loss}`;
    case "faded":
      return `${arc.name} ${trajectory(arc)}. ${statsLine(arc)}. Whatever that opening form was, it did not survive contact with the court.${loss}${rest}`;
    case "consistent":
      return `${arc.name} ${trajectory(arc)} with ${statsLine(arc)}. Same rank all day — commitment to the bit.${rest}`;
    default:
      return `${arc.name} ${trajectory(arc)}, ${statsLine(arc)}. A walking plot twist with a racket.${loss}${rest}`;
  }
}

export function renderTemplateRecap(
  arc: PlayerArc,
  tone: FeedbackTone,
): string {
  switch (tone) {
    case "formal":
      return formalRecap(arc);
    case "neutral":
      return neutralRecap(arc);
    case "teambuilding":
      return teambuildingRecap(arc);
    case "punchy":
      return punchyRecap(arc);
    case "roast":
      return roastRecap(arc);
  }
}
