"use client";

import { useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { saveMatchAction } from "@/app/actions";
import type { MatchMode, MatchResult, PlayerKey } from "@/types";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { HEROES, MAPS } from "@/lib/ow2/constants";
import { UploadCloud, Wand2, Save, Image as ImageIcon, Layers } from "lucide-react";

type PlayerForm = {
  playerKey: PlayerKey;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  damage?: number | null;
  healing?: number | null;
  mitigation?: number | null;
};

type ParsedPlayerRow = {
  playerKey: PlayerKey;
  hero?: string | null;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing: number;
  mitigation: number;
};

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

type ImportEntry = {
  id: string;
  file: File;
  previewUrl: string;
  screenshotUrl?: string;
  rawText: string;
  players: PlayerForm[];
  playedAt: string;
  mode: MatchMode;
  result: MatchResult;
  map: string;
  status: "idle" | "uploading" | "ocr" | "ready" | "saving" | "done" | "error";
  error?: string | null;
};

const HERO_FALLBACK = "Unknown";
const PLAYER_ORDER: PlayerKey[] = ["ridiculoid", "buttstough"];
const HERO_PRIORITY = ["Reinhardt", "D.Va", "Mercy", "Junkrat", "Lucio", "Torbjorn", "Bastion"];

function normalizeHeroName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function displayHeroName(name: string): string {
  const norm = normalizeHeroName(name);
  if (norm === "lucio") return "Lucio";
  if (norm === "torbjorn") return "Torbjorn";
  return name;
}

const HERO_OPTIONS = (() => {
  const byNorm = new Map(HEROES.map((h) => [normalizeHeroName(h.name), h]));
  const prioritized: { name: string; role: string }[] = [];
  const used = new Set<string>();

  for (const p of HERO_PRIORITY) {
    const found = byNorm.get(normalizeHeroName(p));
    if (found && !used.has(found.name)) {
      prioritized.push(found);
      used.add(found.name);
    }
  }

  const rest = HEROES.filter((h) => !used.has(h.name));
  return [...prioritized, ...rest];
})();

function defaultPlayers(): PlayerForm[] {
  return [
    { playerKey: "ridiculoid", hero: HERO_FALLBACK, kills: 0, deaths: 0, assists: 0, damage: null, healing: null, mitigation: null },
    { playerKey: "buttstough", hero: HERO_FALLBACK, kills: 0, deaths: 0, assists: 0, damage: null, healing: null, mitigation: null },
  ];
}

/** Robust parser that matches OCR variants like BUTISTOUGH / RIOICULOID */
function parseScoreboardOcrLocal(text: string): { players: ParsedPlayerRow[] } {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

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
  const used = new Set<number>();
  const foundNameLine = new Map<PlayerKey, number>();

  const ridIdx = findNameLineIndex(lines, "ridiculoid");
  if (ridIdx !== null) foundNameLine.set("ridiculoid", ridIdx);
  const buttIdx = findNameLineIndex(lines, "buttstough");
  if (buttIdx !== null) foundNameLine.set("buttstough", buttIdx);

  // 0) Hard-match: numbers after name token in the same line
  for (const key of PLAYER_ORDER) {
    const stats = findInlineStats(lines, key);
    if (stats) {
      byKey.set(key, toParsedRowFromStats(key, stats));
    }
  }

  // 1) Prefer rows near the name line, then name-based matches
  for (const key of PLAYER_ORDER) {
    if (byKey.has(key)) continue;
    const nameIdx = foundNameLine.get(key);
    if (nameIdx !== undefined) {
      const near = findNearestRowByIndex(rows, nameIdx, 2);
      if (near) {
        byKey.set(key, toParsedRow(key, near.nums));
        used.add(near.index);
        continue;
      }
    }

    const match = findBestRowByName(rows, key);
    if (match) {
      byKey.set(key, toParsedRow(key, match.nums));
      used.add(match.index);
    }
  }

  // 1b) If still missing, try to build stats from the name line + next lines
  for (const key of PLAYER_ORDER) {
    if (byKey.has(key)) continue;
    const nameIdx = foundNameLine.get(key);
    if (nameIdx === undefined) continue;
    const stats = findStatsNearLine(lines, nameIdx, 2);
    if (stats) {
      byKey.set(key, toParsedRowFromStats(key, stats));
    }
  }

  // 2) Fallback: assign remaining rows top-to-bottom
  const sawAnyName = foundNameLine.size > 0;
  const remainingKeys = PLAYER_ORDER.filter((k) => !byKey.has(k));
  if (!sawAnyName && remainingKeys.length > 0) {
    const remainingRows = rows
      .filter((r) => !used.has(r.index))
      .sort((a, b) => a.index - b.index);

    for (let i = 0; i < remainingKeys.length && i < remainingRows.length; i++) {
      byKey.set(remainingKeys[i], toParsedRow(remainingKeys[i], remainingRows[i].nums));
    }
  }

  const players: ParsedPlayerRow[] = [];
  for (const key of PLAYER_ORDER) {
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

function findNearestRowByIndex(rows: RowCandidate[], index: number, maxDistance: number): RowCandidate | null {
  let best: { row: RowCandidate; score: number; dist: number } | null = null;

  for (const row of rows) {
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

function findStatsNearLine(lines: string[], index: number, maxDistance: number): StatWindow | null {
  const nums: number[] = [];
  for (let i = index; i <= Math.min(lines.length - 1, index + maxDistance); i++) {
    if (shouldSkipLine(lines[i])) continue;
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

function toParsedRowFromStats(playerKey: PlayerKey, stats: StatWindow): ParsedPlayerRow {
  return {
    playerKey,
    hero: null,
    kills: stats.kills,
    deaths: stats.deaths,
    assists: stats.assists,
    damage: stats.damage,
    healing: stats.healing,
    mitigation: stats.mitigation,
  };
}

function toParsedRow(playerKey: PlayerKey, nums: number[] | null): ParsedPlayerRow {
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

  return {
    playerKey,
    hero: null,
    kills: stats.kills,
    deaths: stats.deaths,
    assists: stats.assists,
    damage: stats.damage,
    healing: stats.healing,
    mitigation: stats.mitigation,
  };
}

function pickBestStatWindowWithScore(nums: number[]): ScoredWindow | null {
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
      ? ["RIDICULOID", "RIOICULOID", "RIGICULOID", "RI0ICULOID", "RIDICUL0ID"]
      : ["BUTTSTOUGH", "BUTTSTOVGH", "BUTISTOUGH", "BURTSTOUGH", "BUTTS100GH", "BUTTST0UGH"];

  let best: { row: RowCandidate; dist: number; score: number } | null = null;

  for (const row of rows) {
    const tokens = extractWordTokens(row.line).map(normalizeToken);

    let minDist = Infinity;
    for (const t of tokens) {
      for (const target of targets) {
        const dist = levenshtein(t, target);
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

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function applyGrayscaleAndContrast(data: Uint8ClampedArray, contrast: number) {
  const c = clampByte(contrast);
  const factor = (259 * (c + 255)) / (255 * (259 - c));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const adj = clampByte(factor * (gray - 128) + 128);
    data[i] = adj;
    data[i + 1] = adj;
    data[i + 2] = adj;
  }
}

async function preprocessImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();

    const minWidth = 1600;
    const minHeight = 900;
    const scale = Math.max(1, minWidth / img.width, minHeight / img.height);

    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return url;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    // Crop to the central scoreboard region to reduce OCR noise.
    const cropW = Math.round(width * 0.7);
    const cropH = Math.round(height * 0.55);
    const cropX = Math.round((width - cropW) / 2);
    const cropY = Math.round((height - cropH) / 2);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return canvas.toDataURL("image/png");

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = "high";
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const imageData = cropCtx.getImageData(0, 0, cropW, cropH);
    applyGrayscaleAndContrast(imageData.data, 60);
    cropCtx.putImageData(imageData, 0, 0);

    return cropCanvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function UploadAndParse() {
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "uploading" | "ocr" | "confirm" | "saving" | "done" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeEntry = useMemo(() => entries.find((e) => e.id === activeId) ?? entries[0] ?? null, [entries, activeId]);
  const canStart = entries.length > 0 && status !== "uploading" && status !== "ocr" && status !== "saving";

  const progressSteps = useMemo(() => {
    const isUpload = status !== "idle" && status !== "error";
    const isOcr = status === "ocr" || status === "confirm" || status === "saving" || status === "done";
    const isConfirm = status === "confirm" || status === "saving" || status === "done";

    return [
      { label: "UPLOAD", done: isUpload },
      { label: "OCR", done: isOcr },
      { label: "CONFIRM", done: isConfirm },
    ];
  }, [status]);

  function makeEntry(file: File): ImportEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      rawText: "",
      players: defaultPlayers(),
      playedAt: new Date().toISOString().slice(0, 16),
      mode: "QP",
      result: "W",
      map: "",
      status: "idle",
      error: null,
    };
  }

  function onPickFiles(files: FileList | null) {
    setError(null);
    setStatus("idle");
    setProgress(0);

    setEntries((prev) => {
      prev.forEach((e) => URL.revokeObjectURL(e.previewUrl));
      return [];
    });

    if (!files || files.length === 0) {
      setActiveId(null);
      return;
    }

    const next = Array.from(files).map(makeEntry);
    setEntries(next);
    setActiveId(next[0].id);
  }

  function updateEntry(id: string, patch: Partial<ImportEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function uploadToBlob(selected: File): Promise<string> {
    const form = new FormData();
    form.set("file", selected);
    form.set("filename", `scoreboard-${Date.now()}.png`);
    const res = await fetch("/api/blob/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Blob upload failed");
    const json = await res.json();
    if (!json?.url) throw new Error("Blob upload missing url");
    return json.url as string;
  }

  async function runOCR(selected: File) {
    setStatus("ocr");
    setProgress(0);

    const preprocessed = await preprocessImage(selected);

    const { data } = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") setProgress(Math.round((m.progress ?? 0) * 100));
      },
    });
    return data.text ?? "";
  }

  async function handleStartAll() {
    if (entries.length === 0) return;
    setError(null);

    try {
      for (const entry of entries) {
        updateEntry(entry.id, { status: "uploading", error: null });
        setStatus("uploading");

        const url = await uploadToBlob(entry.file);
        updateEntry(entry.id, { screenshotUrl: url });

        const text = await runOCR(entry.file);
        updateEntry(entry.id, { rawText: text, status: "ocr" });

        const parsed = parseScoreboardOcrLocal(text);

        updateEntry(entry.id, {
          players: entry.players.map((p) => {
            const found = parsed.players.find((x) => x.playerKey === p.playerKey);
            return {
              ...p,
              hero: found?.hero ?? p.hero ?? HERO_FALLBACK,
              kills: found?.kills ?? 0,
              deaths: found?.deaths ?? 0,
              assists: found?.assists ?? 0,
              damage: found?.damage ?? null,
              healing: found?.healing ?? null,
              mitigation: found?.mitigation ?? null,
            };
          }),
          status: "ready",
        });
      }

      setStatus("confirm");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Import failed");
    }
  }

  async function handleSaveActive() {
    if (!activeEntry) return;

    if (!activeEntry.map.trim()) {
      setError("Map is required.");
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      const payload = {
        playedAt: new Date(activeEntry.playedAt).toISOString(),
        mode: activeEntry.mode,
        result: activeEntry.result,
        map: activeEntry.map.trim(),
        screenshotUrl: activeEntry.screenshotUrl,
        players: activeEntry.players.map((p) => ({
          ...p,
          hero: p.hero?.trim() || HERO_FALLBACK,
          kills: Number(p.kills) || 0,
          deaths: Number(p.deaths) || 0,
          assists: Number(p.assists) || 0,
          damage: p.damage ?? null,
          healing: p.healing ?? null,
          mitigation: p.mitigation ?? null,
        })),
      };

      await saveMatchAction(payload);
      updateEntry(activeEntry.id, { status: "done" });
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Save failed");
    }
  }

  const title = useMemo(() => {
    if (status === "ocr") return `OCR RUNNING - ${progress}%`;
    if (status === "uploading") return "UPLOADING";
    if (status === "confirm") return "CONFIRM PARSE";
    if (status === "saving") return "SAVING";
    if (status === "done") return "IMPORTED";
    if (status === "error") return "ERROR";
    return "IMPORT SCREENSHOT";
  }, [status, progress]);

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display tracking-widest text-sm text-foreground text-glow">{title}</div>
            <div className="flex items-center gap-2">
              {activeEntry ? (
                <Button onClick={handleSaveActive} className="gap-2" disabled={activeEntry.status === "saving"}>
                  <Save className="w-4 h-4" />
                  SAVE MATCH
                </Button>
              ) : null}

              <Button onClick={handleStartAll} disabled={!canStart} className="gap-2" variant={entries.length > 0 ? "outline" : "primary"}>
                <Wand2 className="w-4 h-4" />
                {entries.length > 1 ? "RUN OCR (ALL)" : "RUN OCR"}
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-primary/20 bg-background/40 px-4 py-3">
            <div className="flex items-center justify-between text-[10px] font-display tracking-widest text-muted-foreground">
              {progressSteps.map((step, idx) => (
                <div key={step.label} className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-2.5 w-2.5 rounded-full border",
                        step.done ? "bg-primary border-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" : "border-border"
                      )}
                    />
                    <span className={cn(step.done ? "text-primary" : "text-muted-foreground")}>{step.label}</span>
                  </div>
                  {idx < progressSteps.length - 1 ? (
                    <div className="mt-2 h-[2px] w-full bg-border/60">
                      <div className={cn("h-full", progressSteps[idx + 1].done ? "bg-primary" : "bg-border")} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">SCREENSHOT</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="w-4 h-4" />
                  {entries.length > 1 ? `${entries.length} FILES` : entries.length === 1 ? entries[0].file.name : "CHOOSE IMAGE"}
                </Button>
              </div>

              {activeEntry ? (
                <div>
                  <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">PLAYED AT</label>
                  <Input
                    type="datetime-local"
                    value={activeEntry.playedAt}
                    onChange={(e) => updateEntry(activeEntry.id, { playedAt: e.target.value })}
                  />
                </div>
              ) : null}
            </div>

            {entries.length > 1 ? (
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">BULK FILES</label>
                <div className="grid gap-2">
                  {entries.map((e) => (
                    <Button
                      key={e.id}
                      type="button"
                      variant={activeEntry?.id === e.id ? "primary" : "outline"}
                      className="justify-start gap-2"
                      onClick={() => setActiveId(e.id)}
                    >
                      <Layers className="w-4 h-4" />
                      {e.file.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeEntry ? (
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MODE</label>
                  <Select value={activeEntry.mode} onChange={(e) => updateEntry(activeEntry.id, { mode: e.target.value as MatchMode })}>
                    <option value="QP">QP</option>
                    <option value="COMP">COMP</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="OTHER">OTHER</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">RESULT</label>
                  <Select value={activeEntry.result} onChange={(e) => updateEntry(activeEntry.id, { result: e.target.value as MatchResult })}>
                    <option value="W">W</option>
                    <option value="L">L</option>
                    <option value="D">D</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MAP</label>
                  <Input value={activeEntry.map} onChange={(e) => updateEntry(activeEntry.id, { map: e.target.value })} placeholder="e.g. KING'S ROW" />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="text-xs font-mono tracking-widest text-danger border border-danger/40 bg-danger/10 rounded-lg px-3 py-2">{error}</div>
            ) : null}

            {activeEntry ? (
              <div className="grid gap-3">
                {activeEntry.players.map((p) => (
                  <Card key={p.playerKey} className="bg-card/40">
                    <CardContent className="p-4">
                      <div className="font-display tracking-widest text-sm text-foreground">{p.playerKey.toUpperCase()}</div>

                      <div className="mt-3 grid sm:grid-cols-6 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">HERO</label>
                          <Select
                            value={p.hero}
                            onChange={(e) =>
                              updateEntry(activeEntry.id, {
                                players: activeEntry.players.map((x) =>
                                  x.playerKey === p.playerKey ? { ...x, hero: e.target.value } : x
                                ),
                              })
                            }
                          >
                            <option value={HERO_FALLBACK}>{HERO_FALLBACK}</option>
                            {HERO_OPTIONS.map((h) => (
                              <option key={`${p.playerKey}-${h.name}`} value={h.name}>
                                {displayHeroName(h.name)}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">K</label>
                          <Input
                            value={String(p.kills)}
                            onChange={(e) =>
                              updateEntry(activeEntry.id, {
                                players: activeEntry.players.map((x) =>
                                  x.playerKey === p.playerKey ? { ...x, kills: Number(e.target.value || 0) } : x
                                ),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">D</label>
                          <Input
                            value={String(p.deaths)}
                            onChange={(e) =>
                              updateEntry(activeEntry.id, {
                                players: activeEntry.players.map((x) =>
                                  x.playerKey === p.playerKey ? { ...x, deaths: Number(e.target.value || 0) } : x
                                ),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">A</label>
                          <Input
                            value={String(p.assists)}
                            onChange={(e) =>
                              updateEntry(activeEntry.id, {
                                players: activeEntry.players.map((x) =>
                                  x.playerKey === p.playerKey ? { ...x, assists: Number(e.target.value || 0) } : x
                                ),
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">DMG</label>
                          <Input value={p.damage ?? ""} readOnly />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">H</label>
                          <Input value={p.healing ?? ""} readOnly />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">MIT</label>
                          <Input value={p.mitigation ?? ""} readOnly />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="font-display tracking-widest text-sm text-foreground">PREVIEW</div>
            {activeEntry?.screenshotUrl ? (
              <a className="text-xs font-mono tracking-widest text-primary underline" href={activeEntry.screenshotUrl} target="_blank" rel="noreferrer">
                OPEN BLOB
              </a>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/20 overflow-hidden aspect-video flex items-center justify-center">
            {activeEntry?.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeEntry.previewUrl} alt="scoreboard preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="w-10 h-10" />
                <div className="mt-2 text-xs font-mono tracking-widest">NO IMAGE</div>
              </div>
            )}
          </div>

          <div className={cn("mt-4", activeEntry?.rawText ? "" : "opacity-60")}>
            <div className="font-display tracking-widest text-xs text-muted-foreground">RAW OCR TEXT</div>
            <pre className="mt-2 text-[11px] leading-5 font-mono text-muted-foreground whitespace-pre-wrap border border-border bg-card/40 rounded-xl p-3 max-h-[360px] overflow-auto">
              {activeEntry?.rawText || "--"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
