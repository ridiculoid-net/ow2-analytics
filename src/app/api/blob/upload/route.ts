import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { ENV } from "@/lib/env.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const filename = form.get("filename");
    const safeName =
      typeof filename === "string" && filename.trim()
        ? filename.trim()
        : `${Date.now()}-${file.name || "screenshot"}`;

    const blob = await put(`ow2/${safeName}`, file, {
      access: "public",
      token: ENV.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || "image/png",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
