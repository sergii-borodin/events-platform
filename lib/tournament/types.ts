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
