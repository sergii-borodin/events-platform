export type TournamentType = "americano" | "mexicano";
export type PointsTo = 11 | 16 | 21 | 24 | 32;
export type ResultSorting = "pointsFirst" | "winsFirst";

export type EnginePlayer = {
  id: string;
  name: string;
};

export type EngineCourt = {
  id: string;
  name: string;
};

export type EngineTeam = {
  playerIds: string[];
  score: number | null;
};

export type EngineMatch = {
  id: string;
  courtId: string;
  teamA: EngineTeam;
  teamB: EngineTeam;
};

export type EngineRound = {
  index: number;
  isFinal: boolean;
  matches: EngineMatch[];
  restingPlayerIds: string[];
};

export type StandingRow = {
  playerId: string;
  name: string;
  points: number;
  wins: number;
  matchesPlayed: number;
  rank: number;
};

export type PairHistory = Map<string, Map<string, number>>;

export type FeedbackTone =
  | "formal"
  | "neutral"
  | "teambuilding"
  | "punchy"
  | "roast";

export type PlayerHighlight =
  | "champion"
  | "comeback"
  | "faded"
  | "consistent"
  | "wildcard";

export type PlayerArc = {
  playerId: string;
  name: string;
  finalRank: number;
  firstRank: number;
  rankDelta: number;
  rankHistory: number[];
  points: number;
  wins: number;
  matchesPlayed: number;
  restRounds: number;
  biggestWinMargin: number | null;
  heaviestLossMargin: number | null;
  lastPlayedWon: boolean | null;
  restedLastRound: boolean;
  favoritePartnerName: string | null;
  highlight: PlayerHighlight;
};

export type PlayerRecap = {
  playerId: string;
  text: string;
};
