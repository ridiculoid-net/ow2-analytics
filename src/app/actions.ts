"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ENV } from "@/lib/env.server";
import { createMatch, type CreateMatchInput } from "@/lib/db";

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
  return { ok: true, matchId: match.id };
}
