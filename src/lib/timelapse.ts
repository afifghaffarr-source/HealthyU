export type TimelapsePhoto = { url: string; taken_at: string };

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = url;
  });
}

function pickMime(): { mime: string; ext: string } {
  const cands = [
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/mp4", ext: "mp4" },
  ];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

/**
 * Render foto progres ke canvas dan rekam jadi video.
 * Setiap foto tampil selama `frameMs` ms.
 */
export async function generateTimelapse(
  photos: TimelapsePhoto[],
  opts: { width?: number; height?: number; frameMs?: number; fps?: number } = {},
): Promise<{ blob: Blob; ext: string; url: string }> {
  const width = opts.width ?? 720;
  const height = opts.height ?? 720;
  const frameMs = opts.frameMs ?? 700;
  const fps = opts.fps ?? 30;

  if (photos.length < 2) throw new Error("Butuh minimal 2 foto");
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Browser tidak mendukung MediaRecorder");
  }

  const sorted = [...photos].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
  );
  const images = await Promise.all(sorted.map((p) => loadImage(p.url)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");

  const { mime, ext } = pickMime();
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
  });

  const drawFrame = (img: HTMLImageElement, label: string) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    // contain
    const r = Math.min(width / img.width, height / img.height);
    const w = img.width * r;
    const h = img.height * r;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    // label
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, height - 56, width, 56);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 20, height - 28);
  };

  recorder.start();
  drawFrame(images[0], new Date(sorted[0].taken_at).toLocaleDateString("id-ID"));

  for (let i = 0; i < images.length; i++) {
    drawFrame(images[i], new Date(sorted[i].taken_at).toLocaleDateString("id-ID"));
    await new Promise((r) => setTimeout(r, frameMs));
  }

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  const blob = await finished;
  const url = URL.createObjectURL(blob);
  return { blob, ext, url };
}
