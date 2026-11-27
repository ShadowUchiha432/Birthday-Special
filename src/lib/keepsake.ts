// Point this to the deployed server-side Worker from server/github-keepsake-worker.mjs.
// Leave it empty for local-only photo downloads. Never put a GitHub token here.
export const GITHUB_UPLOAD_ENDPOINT = "https://birthday-keepsake-upload.shadowuchiha432.workers.dev";

export type GitHubUploadResult =
  | { status: "sent" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type KeepsakeVariant = "screen" | "birthday" | "face";

function loadSvgImage(svgElement: SVGSVGElement): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    try {
      const clone = svgElement.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const vw = video.videoWidth || 4;
  const vh = video.videoHeight || 3;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, width - dx - dw, dy, dw, dh);
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.32, 50, width * 0.5, height * 0.5, height * 0.78);
  bg.addColorStop(0, "#6b4658");
  bg.addColorStop(0.52, "#46303f");
  bg.addColorStop(1, "#261a26");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const tint = ctx.createLinearGradient(0, 0, 0, height);
  tint.addColorStop(0, "rgba(38, 22, 34, 0.38)");
  tint.addColorStop(0.3, "rgba(38, 22, 34, 0.04)");
  tint.addColorStop(0.74, "rgba(38, 22, 34, 0.2)");
  tint.addColorStop(1, "rgba(32, 18, 28, 0.58)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxSize: number,
  maxWidth: number,
  makeFont: (size: number) => string,
) {
  let size = maxSize;
  while (size > 16) {
    ctx.font = makeFont(size);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-9, -1, -9, -9, -3.4, -9);
  ctx.bezierCurveTo(-0.8, -9, 0, -6.6, 0, -5.4);
  ctx.bezierCurveTo(0, -6.6, 0.8, -9, 3.4, -9);
  ctx.bezierCurveTo(9, -9, 9, -1, 0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawConfetti(ctx: CanvasRenderingContext2D, width: number, height: number, seed = 1) {
  let value = seed * 9301 + 49297;
  const random = () => {
    value = (value * 233280 + 9301) % 2147483647;
    return value / 2147483647;
  };
  const colors = ["#ff8fb8", "#ffd98e", "#c9a7ff", "#9be7d8", "#fff3d6"];
  for (let i = 0; i < 58; i++) {
    const x = random() * width;
    const y = random() * height * 0.6;
    const size = 3 + random() * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random() * Math.PI);
    ctx.globalAlpha = 0.68 + random() * 0.3;
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.fillRect(-size / 2, -size / 2, size, size * (0.7 + random() * 1.1));
    ctx.restore();
  }
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    drawHeart(ctx, random() * width, random() * height * 0.55, 5 + random() * 7, random() * Math.PI);
    ctx.restore();
  }
}

function drawScreenKeepsake(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cakeImg: HTMLImageElement | null,
  stageRect: DOMRect,
  cakeRect: DOMRect | undefined,
  width: number,
  height: number,
) {
  const scaleX = width / Math.max(1, stageRect.width);
  const scaleY = height / Math.max(1, stageRect.height);

  drawBackdrop(ctx, width, height);
  if (video.readyState >= 2) drawCover(ctx, video, width, height);
  drawVignette(ctx, width, height);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 224, 236, 0.92)";
  ctx.font = '700 18px "DM Sans", sans-serif';
  ctx.fillText("ALL YOUR CANDLES ARE OUT", width / 2, height * 0.095);

  const titleSize = fitFont(
    ctx,
    "Happy Birthday babe ^^",
    Math.round(width * 0.07),
    width * 0.9,
    (size) => `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`,
  );
  ctx.font = `italic 600 ${titleSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.shadowColor = "rgba(40, 16, 30, 0.72)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#fff8f6";
  ctx.fillText("Happy Birthday babe ^^", width / 2, height * 0.16);
  ctx.restore();

  if (cakeImg && cakeRect) {
    const relativeX = (cakeRect.left - stageRect.left) * scaleX;
    const relativeY = (cakeRect.top - stageRect.top) * scaleY;
    const relativeW = cakeRect.width * scaleX;
    const relativeH = cakeRect.height * scaleY;
    ctx.save();
    ctx.shadowColor = "rgba(24, 10, 20, 0.5)";
    ctx.shadowBlur = 28;
    ctx.drawImage(cakeImg, relativeX, relativeY, relativeW, relativeH);
    ctx.restore();
  }

  drawConfetti(ctx, width, height, 11);
  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.fillStyle = "rgba(255, 226, 234, 0.94)";
  ctx.font = `italic 500 ${Math.max(18, Math.round(width * 0.025))}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText("With love, Rex", width / 2, height * 0.95);
  ctx.restore();
}

function drawBirthdayPortrait(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  drawBackdrop(ctx, width, height);
  if (video.readyState >= 2) drawCover(ctx, video, width, height);
  drawVignette(ctx, width, height);
  drawConfetti(ctx, width, Math.round(height * 0.55), 23);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 224, 236, 0.9)";
  ctx.font = '700 17px "DM Sans", sans-serif';
  ctx.fillText("HAPPY BIRTHDAY", width / 2, height * 0.16);
  const titleSize = fitFont(
    ctx,
    "babe ^^",
    110,
    width * 0.88,
    (size) => `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`,
  );
  ctx.font = `italic 600 ${titleSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.shadowColor = "rgba(40, 16, 30, 0.75)";
  ctx.shadowBlur = 32;
  ctx.fillStyle = "#fff7f7";
  ctx.fillText("babe ^^", width / 2, height * 0.28);
  ctx.font = `italic 500 ${Math.max(22, Math.round(width * 0.035))}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = "rgba(255, 230, 238, 0.96)";
  ctx.fillText("With all my love — Rex", width / 2, height * 0.91);
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 236, 240, 0.34)";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, width - 36, height - 36);
}

function skinBounds(data: Uint8ClampedArray, width: number, height: number) {
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const saturation = max === 0 ? 0 : delta / max;
      let hue = 0;
      if (delta !== 0) {
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue /= 6;
        if (hue < 0) hue += 1;
      }
      const looksLikeSkin = (hue < 0.13 || hue > 0.94) && saturation > 0.12 && max > 0.07;
      if (looksLikeSkin) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return count > width * height * 0.018 ? { count, minX, minY, maxX, maxY } : null;
}

function drawFaceCloseup(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  drawBackdrop(ctx, width, height);

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  let sx = vw * 0.23;
  let sy = vh * 0.05;
  let size = Math.min(vw, vh) * 0.66;

  try {
    const sample = document.createElement("canvas");
    sample.width = 160;
    sample.height = 120;
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    if (sctx) {
      sctx.drawImage(video, 0, 0, sample.width, sample.height);
      const img = sctx.getImageData(0, 0, sample.width, sample.height);
      const bounds = skinBounds(img.data, sample.width, sample.height);
      if (bounds) {
        const bx = (bounds.minX + bounds.maxX) / 2 / sample.width;
        const by = (bounds.minY + bounds.maxY) / 2 / sample.height;
        const bw = (bounds.maxX - bounds.minX) / sample.width;
        const bh = (bounds.maxY - bounds.minY) / sample.height;
        size = Math.min(vw, vh) * Math.min(0.88, Math.max(0.46, Math.max(bw, bh) * 1.42));
        sx = bx * vw - size / 2;
        sy = by * vh - size / 2;
      }
    }
  } catch {
    // Camera frames can be unavailable to canvas in rare browser modes.
  }

  const clamped = Math.min(size, vw, vh);
  sx = Math.max(0, Math.min(vw - clamped, sx));
  sy = Math.max(0, Math.min(vh - clamped, sy));

  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, clamped, clamped, width - width, 0, width, height);
  ctx.restore();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(36, 19, 29, 0.08)");
  vignette.addColorStop(1, "rgba(36, 19, 29, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 230, 238, 0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, width - 30, height - 30);
}

/**
 * Creates the visible memory-mode sequence:
 * 1 = whole scene, 2 = her + birthday message, 3+ = a face-only close-up.
 * The camera is downscaled only to a high-quality 1600px cap.
 */
export async function captureCakeKeepsake(
  video: HTMLVideoElement | null,
  cakeSvg: SVGSVGElement | null,
  stage: HTMLElement | null,
  shotNumber: number,
): Promise<{ blob: Blob; url: string; variant: KeepsakeVariant }> {
  if (!video || video.readyState < 2) throw new Error("Camera is not ready");

  const canvas = document.createElement("canvas");
  const variant: KeepsakeVariant = shotNumber === 1 ? "screen" : shotNumber === 2 ? "birthday" : "face";
  const stageRect = stage?.getBoundingClientRect() ?? new DOMRect(0, 0, 960, 1280);
  const cakeRect = (cakeSvg?.closest(".cake-filter") as HTMLElement | null)?.getBoundingClientRect();
  const cakeImg = cakeSvg ? await loadSvgImage(cakeSvg) : null;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  if (variant === "screen") {
    const aspect = Math.max(0.45, stageRect.width / Math.max(1, stageRect.height));
    const width = aspect >= 1 ? 1600 : Math.min(1100, Math.round(1500 * aspect));
    const height = Math.round(width / aspect);
    canvas.width = width;
    canvas.height = height;
    drawScreenKeepsake(ctx, video, cakeImg, stageRect, cakeRect, width, height);
  } else if (variant === "birthday") {
    canvas.width = 960;
    canvas.height = 1280;
    drawBirthdayPortrait(ctx, video, 960, 1280);
  } else {
    canvas.width = 900;
    canvas.height = 900;
    drawFaceCloseup(ctx, video, 900, 900);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create photo"))), "image/png");
  });
  return { blob, url: URL.createObjectURL(blob), variant };
}

export function triggerPhotoDownload(url: string, filename = "birthday-memory.png") {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function uploadKeepsakeToGitHub(
  blob: Blob,
  filename = "birthday-memory.png",
): Promise<GitHubUploadResult> {
  const endpoint = GITHUB_UPLOAD_ENDPOINT.trim();
  if (!endpoint) {
    return { status: "unconfigured" };
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "image/png", "X-Photo-Name": filename },
      body: blob,
    });
    if (!response.ok) {
      return { status: "error", message: `GitHub upload failed (${response.status})` };
    }
    return { status: "sent" };
  } catch {
    return { status: "error", message: "Could not reach the GitHub upload service" };
  }
}
