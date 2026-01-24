// src/lib/ocr/parse.ts
import type { PlayerKey } from "@/types";

type RowCandidate = {
  line: string;
  nums: number[];
  index: number;
};

type StatWindow = {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing: number;
  mitigation: number;
};

type ScoredWindow = {
  stats: StatWindow;
  score: number;
};

type KdaOrder = "KDA" | "KAD";

export type ParsedPlayerRow = {
  playerKey: PlayerKey;
  hero?: string | null; // not reliable from screenshot; leave null
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing: number;
  mitigation: number;
};

export type ParsedScoreboard = {
  players: ParsedPlayerRow[];
};

export function parseScoreboardOcr(text: string): ParsedScoreboard {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const kdaOrder = detectKdaOrder(lines);

  let rows = extractRowCandidates(lines);
  const filtered = rows.filter((r) => isLikelyStatRow(r.nums));
  if (filtered.length > 0) rows = filtered;

  if (rows.length === 0) {
    const allNums = extractNumbers(lines.join(" "));
    if (allNums.length >= 6) {
      rows = [];
      for (let i = 0; i + 5 < allNums.length; i += 6) {
        rows.push({ line: "", nums: allNums.slice(i, i + 6), index: i / 6 });
      }
    }
  }

  const byKey = new Map<PlayerKey, ParsedPlayerRow>();
  const foundNameLine = new Map<PlayerKey, number>();

  const ridIdx = findNameLineIndex(lines, "ridiculoid");
  if (ridIdx !== null) foundNameLine.set("ridiculoid", ridIdx);
  const buttIdx = findNameLineIndex(lines, "buttstough");
  if (buttIdx !== null) foundNameLine.set("buttstough", buttIdx);

  const ridInline = findInlineStats(lines, "ridiculoid");
  if (ridInline) byKey.set("ridiculoid", toParsedRowFromStats("ridiculoid", ridInline, kdaOrder));

  const buttInline = findInlineStats(lines, "buttstough");
  if (buttInline) byKey.set("buttstough", toParsedRowFromStats("buttstough", buttInline, kdaOrder));

  for (const key of ["ridiculoid", "buttstough"] as const) {
    if (byKey.has(key)) continue;

    const nameIdx = foundNameLine.get(key);
    if (nameIdx !== undefined) {
      const near = findNearestRowByIndex(rows, nameIdx, 2, key);
      if (near) {
        byKey.set(key, toParsedRow(key, near.nums, kdaOrder));
        continue;
      }
    }

    const match = findBestRowByName(rows, key);
    if (match) byKey.set(key, toParsedRow(key, match.nums, kdaOrder));
  }

  for (const key of ["ridiculoid", "buttstough"] as const) {
    if (byKey.has(key)) continue;
    const nameIdx = foundNameLine.get(key);
    if (nameIdx === undefined) continue;
    const stats = findStatsNearLine(lines, nameIdx, 2, key);
    if (stats) byKey.set(key, toParsedRowFromStats(key, stats, kdaOrder));
  }

  // Fallback only if we never saw either name.
  const sawAnyName = foundNameLine.size > 0;
  if (!sawAnyName && byKey.size < 2) {
    const remainingRows = rows.sort((a, b) => a.index - b.index);
    const remainingKeys: PlayerKey[] = [];
    if (!byKey.has("ridiculoid")) remainingKeys.push("ridiculoid");
    if (!byKey.has("buttstough")) remainingKeys.push("buttstough");

    let rowIdx = 0;
    for (const key of remainingKeys) {
      if (rowIdx >= remainingRows.length) break;
      byKey.set(key, toParsedRow(key, remainingRows[rowIdx].nums, kdaOrder));
      rowIdx++;
    }
  }

  const players: ParsedPlayerRow[] = [];
  for (const key of ["ridiculoid", "buttstough"] as const) {
    const row = byKey.get(key);
    if (row) players.push(row);
  }

  return { players };
}

function findNameLineIndex(lines: string[], playerKey: PlayerKey): number | null {
  const targets =
    playerKey === "ridiculoid"
      ? ["RIDICULOID", "RIOICULOID", "RIGICULOID", "RI0ICULOID", "RIDICUL0ID"]
      : ["BUTTSTOUGH", "BUTTSTOVGH", "BUTISTOUGH", "BURTSTOUGH", "BUTTS100GH", "BUTTST0UGH"];

  let bestIdx: number | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line)) continue;
    const tokens = line.split(/\s+/).filter(Boolean).map(normalizeToken);

    for (const t of tokens) {
      for (const target of targets) {
        const dist = levenshtein(t, target);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }
  }

  return bestDist <= 2 ? bestIdx : null;
}

function findNearestRowByIndex(rows: RowCandidate[], index: number, maxDistance: number, playerKey: PlayerKey): RowCandidate | null {
  let best: { row: RowCandidate; score: number; dist: number } | null = null;

  for (const row of rows) {
    if (lineHasOtherPlayerName(row.line, playerKey)) continue;
    const dist = row.index - index;
    if (dist < 0 || dist > maxDistance) continue;
    const scored = pickBestStatWindowWithScore(row.nums);
    if (!scored) continue;

    if (!best || scored.score > best.score || (scored.score === best.score && dist < best.dist)) {
      best = { row, score: scored.score, dist };
    }
  }

  return best?.row ?? null;
}

function findStatsNearLine(lines: string[], index: number, maxDistance: number, playerKey: PlayerKey): StatWindow | null {
  const combined = tryCombinePrevKda(lines, index, playerKey);
  if (combined) return combined;

  const nums: number[] = [];
  for (let i = index; i <= Math.min(lines.length - 1, index + maxDistance); i++) {
    if (shouldSkipLine(lines[i])) continue;
    if (i !== index && lineHasAnyPlayerName(lines[i])) break;
    if (lineHasOtherPlayerName(lines[i], playerKey)) break;
    nums.push(...extractNumbers(lines[i]));
    if (nums.length >= 6) break;
  }
  const scored = pickBestStatWindowWithScore(nums);
  return scored?.stats ?? null;
}

function findInlineStats(lines: string[], playerKey: PlayerKey): StatWindow | null {
  const targets =
    playerKey === "ridiculoid"
      ? ["RIDICULOID", "RIOICULOID", "RIGICULOID", "RI0ICULOID", "RIDICUL0ID"]
      : ["BUTTSTOUGH", "BUTTSTOVGH", "BUTISTOUGH", "BURTSTOUGH", "BUTTS100GH", "BUTTST0UGH"];

  let best: ScoredWindow | null = null;

  for (const line of lines) {
    if (shouldSkipLine(line)) continue;

    const tokens = line.split(/\s+/).filter(Boolean);
    let nameIdx = -1;

    for (let i = 0; i < tokens.length; i++) {
      const norm = normalizeToken(tokens[i]);
      for (const target of targets) {
        if (levenshtein(norm, target) <= 2) {
          nameIdx = i;
          break;
        }
      }
      if (nameIdx !== -1) break;
    }

    if (nameIdx === -1) continue;

    const nums = parseNumbersFromTokens(tokens.slice(nameIdx + 1));
    const scored = pickBestStatWindowWithScore(nums);
    if (scored && (!best || scored.score > best.score)) {
      best = scored;
    }
  }

  return best?.stats ?? null;
}

function toParsedRowFromStats(playerKey: PlayerKey, stats: StatWindow, kdaOrder: KdaOrder): ParsedPlayerRow {
  const normalized = normalizeKdaOrder(stats, kdaOrder);
  return {
    playerKey,
    hero: null,
    kills: normalized.kills,
    deaths: normalized.deaths,
    assists: normalized.assists,
    damage: normalized.damage,
    healing: normalized.healing,
    mitigation: normalized.mitigation,
  };
}

function toParsedRow(playerKey: PlayerKey, nums: number[] | null, kdaOrder: KdaOrder): ParsedPlayerRow {
  const safeNums = nums ?? [];
  const best = pickBestStatWindowWithScore(safeNums);
  const stats = best?.stats ?? {
    kills: safeNums.at(-6) ?? 0,
    deaths: safeNums.at(-5) ?? 0,
    assists: safeNums.at(-4) ?? 0,
    damage: safeNums.at(-3) ?? 0,
    healing: safeNums.at(-2) ?? 0,
    mitigation: safeNums.at(-1) ?? 0,
  };
  const normalized = normalizeKdaOrder(stats, kdaOrder);

  return {
    playerKey,
    hero: null,
    kills: normalized.kills,
    deaths: normalized.deaths,
    assists: normalized.assists,
    damage: normalized.damage,
    healing: normalized.healing,
    mitigation: normalized.mitigation,
  };
}

function pickBestStatWindowWithScore(nums: number[]): ScoredWindow | null {
  if (nums.length < 3) return null;

  const base = nums.length >= 6 ? bestStatWindowFromNums(nums) : null;
  let best = base;

  let missingBest: ScoredWindow | null = null;
  for (const insertAt of [0, 1, 2, 5]) {
    const withZero = nums.slice();
    withZero.splice(insertAt, 0, 0);
    const candidate = bestStatWindowFromNums(withZero);
    if (candidate && (!missingBest || candidate.score > missingBest.score)) {
      missingBest = candidate;
    }
  }

  if (!best && missingBest) return missingBest;
  if (best && missingBest) {
    if (missingBest.score > best.score || best.score <= 5) return missingBest;
  }

  if (!best && nums.length >= 3) {
    const tail = nums.slice(-3);
    const score = scoreStatWindow(0, 0, 0, tail[0] ?? 0, tail[1] ?? 0, tail[2] ?? 0);
    if (score !== null) {
      return {
        stats: { kills: 0, deaths: 0, assists: 0, damage: tail[0] ?? 0, healing: tail[1] ?? 0, mitigation: tail[2] ?? 0 },
        score,
      };
    }
  }

  return best;
}

function bestStatWindowFromNums(nums: number[]): ScoredWindow | null {
  if (nums.length < 6) return null;

  let best: ScoredWindow | null = null;

  for (let i = 0; i + 5 < nums.length; i++) {
    const k = nums[i];
    const d = nums[i + 1];
    const a = nums[i + 2];
    const dmg = nums[i + 3];
    const heal = nums[i + 4];
    const mit = nums[i + 5];

    const score = scoreStatWindow(k, d, a, dmg, heal, mit);
    if (score === null) continue;

    if (!best || score > best.score) {
      best = { stats: { kills: k, deaths: d, assists: a, damage: dmg, healing: heal, mitigation: mit }, score };
    }
  }

  return best;
}

function scoreStatWindow(k: number, d: number, a: number, dmg: number, heal: number, mit: number): number | null {
  if (![k, d, a, dmg, heal, mit].every((n) => Number.isFinite(n) && n >= 0)) return null;

  const kdaMax = 80;
  if (k > kdaMax || d > kdaMax || a > kdaMax) return null;

  const statMax = 200000;
  if (dmg > statMax || heal > statMax || mit > statMax) return null;

  let score = 0;

  if (k > 0 || d > 0 || a > 0) score += 5;
  if (dmg >= 100) score += 3;
  if (heal >= 100) score += 2;
  if (mit >= 100) score += 2;

  const hugePenalty = (n: number) => (n >= 100000 ? 5 : 0);
  score -= hugePenalty(dmg);
  score -= hugePenalty(heal);
  score -= hugePenalty(mit);

  return score;
}

function extractRowCandidates(lines: string[]): RowCandidate[] {
  const rows: RowCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    let best: RowCandidate | null = null;

    for (let span = 1; span <= 2 && i + span - 1 < lines.length; span++) {
      const line = lines.slice(i, i + span).join(" ");
      const nums = extractNumbers(line);
      if (nums.length >= 6) {
        best = { line, nums, index: i };
        break;
      }
    }

    if (best) rows.push(best);
  }

  return rows;
}

function isLikelyStatRow(nums: number[]): boolean {
  return pickBestStatWindowWithScore(nums) !== null;
}

function findBestRowByName(rows: RowCandidate[], playerKey: PlayerKey): RowCandidate | null {
  const targets =
    playerKey === "ridiculoid"
      ? ["RIDICULOID", "RIOICULOID", "RIGICULOID", "RIDICUL0ID", "RI0ICULOID"]
      : ["BUTTSTOUGH", "BUTTSTOVGH", "BUTISTOUGH", "BURTSTOUGH", "BUTTS100GH", "BUTTST0UGH"];

  let best: { row: RowCandidate; dist: number; score: number } | null = null;

  for (const row of rows) {
    const tokens = extractWordTokens(row.line);

    let minDist = Infinity;

    for (const t of tokens) {
      const norm = normalizeToken(t);

      for (const target of targets) {
        const dist = levenshtein(norm, target);
        if (dist < minDist) minDist = dist;
      }
    }

    if (minDist > 2) continue;

    const scored = pickBestStatWindowWithScore(row.nums);
    if (!scored) continue;

    if (!best || scored.score > best.score || (scored.score === best.score && minDist < best.dist)) {
      best = { row, dist: minDist, score: scored.score };
    }
  }

  return best ? best.row : null;
}

function extractWordTokens(line: string): string[] {
  const m = line.toUpperCase().match(/[A-Z0-9]{4,}/g);
  return m ?? [];
}

function normalizeToken(token: string): string {
  return token
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S")
    .replace(/[^A-Z]/g, "");
}

function lineHasPlayerName(line: string, playerKey: PlayerKey): boolean {
  const targets =
    playerKey === "ridiculoid"
      ? ["RIDICULOID", "RIOICULOID", "RIGICULOID", "RI0ICULOID", "RIDICUL0ID"]
      : ["BUTTSTOUGH", "BUTTSTOVGH", "BUTISTOUGH", "BURTSTOUGH", "BUTTS100GH", "BUTTST0UGH"];

  const tokens = line.split(/\s+/).filter(Boolean).map(normalizeToken);
  for (const t of tokens) {
    for (const target of targets) {
      if (levenshtein(t, target) <= 2) return true;
    }
  }
  return false;
}

function lineHasAnyPlayerName(line: string): boolean {
  return lineHasPlayerName(line, "ridiculoid") || lineHasPlayerName(line, "buttstough");
}

function lineHasOtherPlayerName(line: string, playerKey: PlayerKey): boolean {
  const otherKey: PlayerKey = playerKey === "ridiculoid" ? "buttstough" : "ridiculoid";
  return lineHasPlayerName(line, otherKey);
}

function tryCombinePrevKda(lines: string[], index: number, playerKey: PlayerKey): StatWindow | null {
  if (index <= 0) return null;
  const currentLine = lines[index];
  if (!lineHasPlayerName(currentLine, playerKey)) return null;

  const currentNums = extractNumbers(currentLine);
  if (currentNums.length < 3 || currentNums.length > 4) return null;

  const prevLine = lines[index - 1];
  if (lineHasAnyPlayerName(prevLine)) return null;
  const prevNums = extractNumbers(prevLine);
  if (prevNums.length < 3) return null;

  const kda = prevNums.slice(-3);
  if (!kda.every((n) => n <= 80)) return null;

  const dmgBlock = currentNums.slice(0, 3);
  const combinedNums = [...kda, ...dmgBlock];
  const scored = pickBestStatWindowWithScore(combinedNums);
  return scored?.stats ?? null;
}

function shouldSkipLine(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes("SUMMARY") || upper.includes("TEAMS") || upper.includes("PERSONAL") || upper.includes("ENTER CHAT");
}

function parseNumbersFromTokens(tokens: string[]): number[] {
  const nums: number[] = [];
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (upper === "A") {
      nums.push(4);
      continue;
    }
    if (upper === "O") {
      nums.push(0);
      continue;
    }
    const found = extractNumbers(token);
    if (found.length) nums.push(...found);
  }

  if (nums.length === 5 && nums[2] >= 100) {
    return [nums[0], nums[1], 0, nums[2], nums[3], nums[4]];
  }

  return nums;
}

function extractNumbers(line: string): number[] {
  const matches = line.match(/\d[\d,.]*\d|\d/g);
  if (!matches) return [];

  return matches
    .map((raw) => normalizeToInt(raw))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .map((n) => Math.trunc(n));
}

function normalizeToInt(s: string): number {
  if (!s) return NaN;

  if (s.includes(",")) {
    const cleaned = s.replace(/,/g, "").replace(/[^\d]/g, "");
    return cleaned ? Number(cleaned) : NaN;
  }

  const dotIdx = s.indexOf(".");
  if (dotIdx !== -1) {
    const after = s.slice(dotIdx + 1);
    if (/^\d{3}$/.test(after)) {
      const cleaned = s.replace(/\./g, "").replace(/[^\d]/g, "");
      return cleaned ? Number(cleaned) : NaN;
    }
  }

  const cleaned = s.replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

function detectKdaOrder(lines: string[]): KdaOrder {
  let sawKda = false;
  let sawKad = false;

  for (const line of lines) {
    const letters = line.toUpperCase().replace(/[^A-Z]/g, "");
    if (!sawKda && letters.includes("KDA")) sawKda = true;
    if (!sawKad && letters.includes("KAD")) sawKad = true;
    if (sawKda && sawKad) break;
  }

  if (sawKad && !sawKda) return "KAD";
  return "KDA";
}

function normalizeKdaOrder(stats: StatWindow, kdaOrder: KdaOrder): StatWindow {
  if (kdaOrder === "KDA") return stats;
  return {
    ...stats,
    deaths: stats.assists,
    assists: stats.deaths,
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);

  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}
