"use client";

import { useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { parseScoreboardOcr } from "@/lib/ocr/parse";
import { saveMatchAction } from "@/app/actions";
import type { MatchMode, MatchResult, PlayerKey } from "@/types";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { UploadCloud, Wand2, Save, Image as ImageIcon } from "lucide-react";

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

const HERO_FALLBACK = "Unknown";

/** File -> HTMLImageElement (browser) */
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function cropCanvas(src: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.floor(w));
  out.height = Math.max(1, Math.floor(h));
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
  return out;
}

function scaleCanvas(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.floor(src.width * scale));
  out.height = Math.max(1, Math.floor(src.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/**
 * Simple grayscale + threshold to boost contrast for small UI text.
 * threshold: 0-255 (lower => darker text preserved)
 */
function grayscaleAndThreshold(src: HTMLCanvasElement, threshold = 160): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(src, 0, 0);

  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const v = lum >= threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return out;
}

export function UploadAndParse() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "uploading" | "ocr" | "confirm" | "saving" | "done" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(undefined);
  const [rawText, setRawText] = useState<string>("");

  const [playedAt, setPlayedAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [mode, setMode] = useState<MatchMode>("COMP");
  const [result, setResult] = useState<MatchResult>("W");
  const [map, setMap] = useState<string>("");

  const [players, setPlayers] = useState<PlayerForm[]>([
    { playerKey: "ridiculoid", hero: HERO_FALLBACK, kills: 0, deaths: 0, assists: 0 },
    { playerKey: "buttstough", hero: HERO_FALLBACK, kills: 0, deaths: 0, assists: 0 },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canStart = !!file && status !== "uploading" && status !== "ocr" && status !== "saving";

  function onPickFile(f: File | null) {
    setFile(f);
    setError(null);
    setStatus("idle");
    setProgress(0);
    setScreenshotUrl(undefined);
    setRawText("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
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

    // 1) file -> image -> canvas
    const img = await fileToImage(selected);
    const full = drawToCanvas(img);

    // 2) crop to the scoreboard region (rough first pass; tune if needed)
    // If RAW OCR TEXT is mostly junk, adjust these percentages.
    const x = Math.floor(full.width * 0.24);
    const y = Math.floor(full.height * 0.12);
    const w = Math.floor(full.width * 0.52);
    const h = Math.floor(full.height * 0.58);

    const cropped = cropCanvas(full, x, y, w, h);

    // 3) upscale + contrast
    const scaled = scaleCanvas(cropped, 2.5);
    const bw = grayscaleAndThreshold(scaled, 160);

    // 4) OCR on processed data URL
    const dataUrl = bw.toDataURL("image/png");

    const { data } = await Tesseract.recognize(dataUrl, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") setProgress(Math.round((m.progress ?? 0) * 100));
      },
    });

    return data.text ?? "";
  }

  async function handleStart() {
    if (!file) return;
    setError(null);

    try {
      setStatus("uploading");
      const url = await uploadToBlob(file);
      setScreenshotUrl(url);

      const text = await runOCR(file);
      setRawText(text);

      const parsed = parseScoreboardOcr(text);

      setPlayers((prev) =>
        prev.map((p) => {
          const found = parsed.players.find((x) => x.playerKey === p.playerKey);
          return {
            ...p,
            hero: found?.hero ?? HERO_FALLBACK,
            kills: found?.kills ?? 0,
            deaths: found?.deaths ?? 0,
            assists: found?.assists ?? 0,
          };
        })
      );

      setStatus("confirm");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Import failed");
    }
  }

  async function handleSave() {
    if (!map.trim()) {
      setError("Map is required.");
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      const payload = {
        playedAt: new Date(playedAt).toISOString(),
        mode,
        result,
        map: map.trim(),
        screenshotUrl,
        players: players.map((p) => ({
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

      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Save failed");
    }
  }

  const title = useMemo(() => {
    if (status === "ocr") return `OCR RUNNING • ${progress}%`;
    if (status === "uploading") return "UPLOADING…";
    if (status === "confirm") return "CONFIRM PARSE";
    if (status === "saving") return "SAVING…";
    if (status === "done") return "IMPORTED";
    if (status === "error") return "ERROR";
    return "IMPORT SCREENSHOT";
  }, [status, progress]);

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display tracking-widest text-sm text-foreground">{title}</div>
            <div className="flex items-center gap-2">
              {status === "confirm" || screenshotUrl ? (
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  SAVE MATCH
                </Button>
              ) : null}

              <Button
                onClick={handleStart}
                disabled={!canStart}
                className="gap-2"
                variant={screenshotUrl ? "outline" : "default"}
              >
                <Wand2 className="w-4 h-4" />
                {screenshotUrl ? "RE-RUN OCR" : "RUN OCR"}
              </Button>

              {screenshotUrl && status !== "confirm" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setStatus("confirm");
                    setError(null);
                  }}
                >
                  SKIP OCR
                </Button>
              ) : null}
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
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="w-4 h-4" />
                  {file ? file.name : "CHOOSE IMAGE"}
                </Button>
                <p className="mt-2 text-[11px] font-mono tracking-widest text-muted-foreground">
                  Use end-of-match scoreboard that includes both players.
                </p>
              </div>

              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">PLAYED AT</label>
                <Input type="datetime-local" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MODE</label>
                <Select value={mode} onChange={(e) => setMode(e.target.value as MatchMode)}>
                  <option value="COMP">COMP</option>
                  <option value="QP">QP</option>
                  <option value="CUSTOM">CUSTOM</option>
                  <option value="OTHER">OTHER</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">RESULT</label>
                <Select value={result} onChange={(e) => setResult(e.target.value as MatchResult)}>
                  <option value="W">W</option>
                  <option value="L">L</option>
                  <option value="D">D</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MAP</label>
                <Input value={map} onChange={(e) => setMap(e.target.value)} placeholder="e.g. KING'S ROW" />
              </div>
            </div>

            {error ? (
              <div className="text-xs font-mono tracking-widest text-danger border border-danger/40 bg-danger/10 rounded-lg px-3 py-2">
                {error}
              </div>
            ) : null}

            {status === "ocr" ? (
              <div className="text-xs font-mono tracking-widest text-muted-foreground">
                OCR PROGRESS: <span className="text-primary">{progress}%</span>
              </div>
            ) : null}

            {status === "done" ? (
              <div className="text-xs font-mono tracking-widest text-primary border border-primary/40 bg-primary/10 rounded-lg px-3 py-2">
                MATCH SAVED. VIEW <a className="underline" href="/matches">MATCHES</a> OR{" "}
                <a className="underline" href="/dashboard">DASHBOARD</a>.
              </div>
            ) : null}

            <div className="grid gap-3">
              {players.map((p, idx) => (
                <Card key={p.playerKey} className="bg-card/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-display tracking-widest text-sm text-foreground">{p.playerKey.toUpperCase()}</div>
                      <div className="text-[11px] font-mono tracking-widest text-muted-foreground">ROW {idx + 1}</div>
                    </div>

                    <div className="mt-3 grid sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">HERO</label>
                        <Input
                          value={p.hero}
                          onChange={(e) =>
                            setPlayers((ps) => ps.map((x) => (x.playerKey === p.playerKey ? { ...x, hero: e.target.value } : x)))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">K</label>
                        <Input
                          value={String(p.kills)}
                          onChange={(e) =>
                            setPlayers((ps) =>
                              ps.map((x) => (x.playerKey === p.playerKey ? { ...x, kills: Number(e.target.value || 0) } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">D</label>
                        <Input
                          value={String(p.deaths)}
                          onChange={(e) =>
                            setPlayers((ps) =>
                              ps.map((x) => (x.playerKey === p.playerKey ? { ...x, deaths: Number(e.target.value || 0) } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-display tracking-widest text-muted-foreground mb-1">A</label>
                        <Input
                          value={String(p.assists)}
                          onChange={(e) =>
                            setPlayers((ps) =>
                              ps.map((x) => (x.playerKey === p.playerKey ? { ...x, assists: Number(e.target.value || 0) } : x))
                            )
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="font-display tracking-widest text-sm text-foreground">PREVIEW</div>
            {screenshotUrl ? (
              <a className="text-xs font-mono tracking-widest text-primary underline" href={screenshotUrl} target="_blank" rel="noreferrer">
                OPEN BLOB
              </a>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/20 overflow-hidden aspect-video flex items-center justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="scoreboard preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="w-10 h-10" />
                <div className="mt-2 text-xs font-mono tracking-widest">NO IMAGE</div>
              </div>
            )}
          </div>

          <div className={cn("mt-4", rawText ? "" : "opacity-60")}>
            <div className="font-display tracking-widest text-xs text-muted-foreground">RAW OCR TEXT</div>
            <pre className="mt-2 text-[11px] leading-5 font-mono text-muted-foreground whitespace-pre-wrap border border-border bg-card/40 rounded-xl p-3 max-h-[360px] overflow-auto">
              {rawText || "—"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
