/**
 * Sprint 28 — Web Share API + canvas PNG renderer for the weekly wrap-up.
 *
 * `shareImage()` calls navigator.share when available (mobile Chrome,
 * Safari, IG/FB in-app) and falls back to a download Blob URL on desktop.
 * `renderShareCardPng()` paints the card client-side on a 4:5 canvas so
 * the generated PNG fits Instagram Story / WhatsApp Status dimensions.
 *
 * Ponytail rationale: previously every share button copy-pasted the
 * share+navigator guard logic. Centralising here means a future
 * WAI/Voice-share variant is one helper edit, not N route edits.
 */
import type { WeeklyShareCard } from "./weeklyShareCard";

export interface ShareCardOptions {
  title: string;
  text: string; // Tagline shown before the image
  file: Blob;
  fileName: string;
}

export async function shareImage(
  opts: ShareCardOptions,
): Promise<
  { ok: true; via: "share-api" | "download" | "clipboard" } | { ok: false; reason: string }
> {
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as Navigator | undefined;
  const file = new File([opts.file], opts.fileName, { type: opts.file.type });

  if (
    nav &&
    typeof nav.share === "function" &&
    typeof nav.canShare === "function" &&
    nav.canShare({ files: [file] })
  ) {
    try {
      await nav.share({ title: opts.title, text: opts.text, files: [file] });
      return { ok: true, via: "share-api" };
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "name" in e &&
        (e as { name?: string }).name === "AbortError"
      ) {
        return { ok: false, reason: "cancelled" };
      }
    }
  }

  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, via: "download" };
  } catch {
    return { ok: false, reason: "download-failed" };
  }
}

/**
 * Render a WeeklyShareCard to a PNG via canvas. Returns a Blob ready
 * for share/download. Pure client-side — no AI cost, no network.
 */
export async function renderShareCardPng(card: WeeklyShareCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const W = 1080;
  const H = 1350; // 4:5 — Instagram Story friendly
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d tidak tersedia");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#10b981");
  grad.addColorStop(1, "#06b6d4");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  const PAD = 80;
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.fillText(
    `Minggu ${(card as WeeklyShareCard & { userName?: string }).userName ?? "Kamu"}`,
    PAD + 32,
    PAD + 32,
  );

  ctx.fillStyle = "#64748b";
  ctx.font = "28px system-ui, sans-serif";
  ctx.fillText(card.weekLabel, PAD + 32, PAD + 110);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 56px system-ui, sans-serif";
  wrapText(ctx, card.headline, PAD + 32, PAD + 180, W - PAD * 2 - 64, 64);

  const stats = [
    { label: "Kalori/hari", value: `${card.avgCaloriesPerDay}kkal` },
    { label: "Latihan", value: `${card.avgWorkoutMinPerDay}m` },
    { label: "Air/hari", value: `${card.avgWaterMlPerDay}ml` },
    { label: "Hari aktif", value: `${card.daysActive}/${card.daysInWeek}` },
  ];
  const cellW = (W - PAD * 2 - 96) / 2;
  const cellH = 220;
  const gridY = PAD + 460;
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + 32 + col * (cellW + 32);
    const y = gridY + row * (cellH + 24);
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(x, y, cellW, cellH);
    ctx.fillStyle = "#64748b";
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText(s.label, x + 24, y + 24);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 60px system-ui, sans-serif";
    ctx.fillText(s.value, x + 24, y + 64);
  });

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.fillText("HealthyU", PAD + 32, H - PAD - 64);
  ctx.fillStyle = "#64748b";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText("healthyu.app", PAD + 32, H - PAD - 28);

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob gagal"))), "image/png"),
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line.trim(), x, cursorY);
      line = w + " ";
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, cursorY);
}
