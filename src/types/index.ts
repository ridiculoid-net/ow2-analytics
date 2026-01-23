export type PlayerKey = "ridiculoid" | "buttstough";

export type MatchResult = "W" | "L" | "D";
export type MatchMode = "COMP" | "QP" | "CUSTOM" | "OTHER";

export type MatchRecord = {
  id: string;
  playedAt: string; // ISO
  mode: MatchMode;
  result: MatchResult;
  map: string;
  notes?: string;
  screenshotUrl?: string;
  createdAt: string; // ISO
};

export type MatchPlayerStats = {
  id: string;
  matchId: string;
  playerKey: PlayerKey;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  damage?: number | null;
  healing?: number | null;
  mitigation?: number | null;
};

export type ParsedPlayerRow = {
  playerKey: PlayerKey;
  hero?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  damage?: number;
  healing?: number;
  mitigation?: number;
};

export type ParsedScreenshot = {
  rawText: string;
  players: ParsedPlayerRow[];
};
