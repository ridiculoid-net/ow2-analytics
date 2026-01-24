"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ENV } from "@/lib/env.server";
import { createMatch, deleteMatch, updateMatch, type CreateMatchInput } from "@/lib/db";

const COOKIE = "ow2_access";

export async function loginWithPasscode(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  const nextPath = String(formData.get("next") ?? "/");

  if (!passcode || passcode !== ENV.APP_PASSCODE) {
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  cookies().set(COOKIE, passcode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(nextPath || "/");
}

const SaveSchema = z.object({
  playedAt: z.string().min(1),
  mode: z.enum(["COMP", "QP", "CUSTOM", "OTHER"]),
  result: z.enum(["W", "L", "D"]),
  map: z.string().min(1),
  notes: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
  players: z
    .array(
      z.object({
        playerKey: z.enum(["ridiculoid", "buttstough"]),
        hero: z.string().min(1),
        kills: z.number().int().nonnegative(),
        deaths: z.number().int().nonnegative(),
        assists: z.number().int().nonnegative(),
        damage: z.number().int().nonnegative().nullable().optional(),
        healing: z.number().int().nonnegative().nullable().optional(),
        mitigation: z.number().int().nonnegative().nullable().optional(),
      })
    )
    .length(2),
});

export async function saveMatchAction(payload: unknown) {
  const parsed = SaveSchema.parse(payload) as CreateMatchInput;
  const match = await createMatch(parsed);
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  return { ok: true, matchId: match.id };
}

const DeleteSchema = z.object({
  matchId: z.string().min(1),
});

export async function deleteMatchAction(formData: FormData) {
  const parsed = DeleteSchema.parse({ matchId: String(formData.get("matchId") ?? "") });
  await deleteMatch(parsed.matchId);
  revalidatePath("/matches");
  revalidatePath("/dashboard");
}

const UpdateSchema = SaveSchema.extend({
  matchId: z.string().min(1),
});

export async function updateMatchAction(formData: FormData) {
  const parseOptionalInt = (value: FormDataEntryValue | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const payload = {
    matchId: String(formData.get("matchId") ?? ""),
    playedAt: String(formData.get("playedAt") ?? ""),
    mode: String(formData.get("mode") ?? ""),
    result: String(formData.get("result") ?? ""),
    map: String(formData.get("map") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
    screenshotUrl: String(formData.get("screenshotUrl") ?? "") || undefined,
    players: [
      {
        playerKey: "ridiculoid",
        hero: String(formData.get("hero_ridiculoid") ?? ""),
        kills: Number(formData.get("kills_ridiculoid") ?? 0),
        deaths: Number(formData.get("deaths_ridiculoid") ?? 0),
        assists: Number(formData.get("assists_ridiculoid") ?? 0),
        damage: parseOptionalInt(formData.get("damage_ridiculoid")),
        healing: parseOptionalInt(formData.get("healing_ridiculoid")),
        mitigation: parseOptionalInt(formData.get("mitigation_ridiculoid")),
      },
      {
        playerKey: "buttstough",
        hero: String(formData.get("hero_buttstough") ?? ""),
        kills: Number(formData.get("kills_buttstough") ?? 0),
        deaths: Number(formData.get("deaths_buttstough") ?? 0),
        assists: Number(formData.get("assists_buttstough") ?? 0),
        damage: parseOptionalInt(formData.get("damage_buttstough")),
        healing: parseOptionalInt(formData.get("healing_buttstough")),
        mitigation: parseOptionalInt(formData.get("mitigation_buttstough")),
      },
    ],
  };

  const parsed = UpdateSchema.parse(payload) as CreateMatchInput & { matchId: string };
  await updateMatch(parsed.matchId, parsed);
  revalidatePath("/matches");
  revalidatePath("/dashboard");
}
