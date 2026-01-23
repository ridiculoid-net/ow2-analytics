"use client";

import type { ParsedScreenshot, PlayerKey } from "@/types";

const PLAYERS: Array<{ key: PlayerKey; label: string }> = [
  { key: "ridiculoid", label: "ridiculoid" },
  { key: "buttstough", label: "buttstough" },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pickHeroCandidate(line: string, playerLabel: string): string | undefined {
  // Very heuristic: take first alphabetic token after the player name.
  const tokens = line.split(/\s+/).filter(Boolean);
  const idx = tokens.findIndex((t) => norm(t) === norm(playerLabel));
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(tokens.length, idx + 6); i++) {
      const t = tokens[i];
      if (/^[A-Za-z][A-Za-z\-']{2,}$/.test(t) && norm(t) !== "k" && norm(t) !== "d" && norm(t) !== "a") {
        return t;
      }
    }
  }
  return undefined;
}

function extractKDA(line: string): { kills?: number; deaths?: number; assists?: number } {
  // Look for sequences like "12 6 9" or "12/6/9"
  const slash = line.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (slash) {
    return { kills: Number(slash[1]), deaths: Number(slash[2]), assists: Number(slash[3]) };
  }
  const nums = (line.match(/\d{1,4}/g) || []).map((n) => Number(n));
  // Heuristic: first 3 numbers on the line are usually K/D/A.
  if (nums.length >= 3) return { kills: nums[0], deaths: nums[1], assists: nums[2] };
  return {};
}

export function parseScoreboardOcr(rawText: string): ParsedScreenshot {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const players = PLAYERS.map(({ key, label }) => {
    const line =
      lines.find((l) => norm(l).includes(norm(label))) ??
      "";

    const hero = line ? pickHeroCandidate(line, label) : undefined;
    const { kills, deaths, assists } = line ? extractKDA(line) : {};

    return {
      playerKey: key,
      hero,
      kills,
      deaths,
      assists,
    };
  });

  return { rawText, players };
}
