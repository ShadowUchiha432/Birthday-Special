import type { Landmark, TrackedHand } from "./handTracking";

export type ScreenPoint = { x: number; y: number; z: number };

export type MagicTrailPoint = { x: number; y: number; born: number };

export type SparkleParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "dot" | "star" | "ring" | "heart" | "petal";
  spin?: number;
};

/**
 * Fit the whole camera frame into the stage without cropping, then mirror it.
 * This keeps the tracked hand proportional on narrow phones and wide desktops.
 */
export function projectPoint(point: Landmark, width: number, height: number, aspect: number): ScreenPoint {
  const videoAspect = aspect && Number.isFinite(aspect) && aspect > 0 ? aspect : width / Math.max(1, height);
  const stageAspect = width / Math.max(1, height);
  let dw: number;
  let dh: number;
  let ox: number;
  let oy: number;
  if (stageAspect >= videoAspect) {
    dh = height;
    dw = height * videoAspect;
    ox = (width - dw) / 2;
    oy = 0;
  } else {
    dw = width;
    dh = width / videoAspect;
    ox = 0;
    oy = (height - dh) / 2;
  }
  return {
    x: ox + (1 - point.x) * dw,
    y: oy + point.y * dh,
    z: point.z * dw,
  };
}

const HAND_SCALE = 0.82;

/** Screen-space hand geometry at true 1:1 size so it never swallows the screen. */
export function handPoints(hand: TrackedHand, width: number, height: number, aspect: number): ScreenPoint[] {
  const raw = hand.landmarks.map((p) => projectPoint(p, width, height, aspect));
  if (raw.length < 21) return raw;
  const pivot = {
    x: (raw[0].x + raw[5].x + raw[9].x + raw[13].x + raw[17].x) / 5,
    y: (raw[0].y + raw[5].y + raw[9].y + raw[13].y + raw[17].y) / 5,
  };
  return raw.map((p) => ({
    x: pivot.x + (p.x - pivot.x) * HAND_SCALE,
    y: pivot.y + (p.y - pivot.y) * HAND_SCALE,
    z: p.z,
  }));
}

const mix = (a: ScreenPoint, b: ScreenPoint, t: number): ScreenPoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

function unit(a: { x: number; y: number }, b: { x: number; y: number }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** roundRect is not available everywhere, so draw the path by hand. */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation = 0, points = 4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.3;
    const a = (i * Math.PI * 2) / total;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rotation = 0) {
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

/* ------------------------------------------------------------------ *
 * Spirit-glow hand: translucent ghost body, neon outline, star joints.
 * ------------------------------------------------------------------ */

const TIP_IDS = new Set([4, 8, 12, 16, 20]);

function smoothChainPath(ctx: CanvasRenderingContext2D, pts: ScreenPoint[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawGhostFinger(
  ctx: CanvasRenderingContext2D,
  joints: ScreenPoint[],
  width: number,
  shimmer: number,
) {
  if (joints.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Outer neon aura
  smoothChainPath(ctx, joints);
  ctx.strokeStyle = `rgba(235, 240, 255, ${0.5 + shimmer * 0.2})`;
  ctx.lineWidth = width + 7;
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = 18;
  ctx.stroke();
  // Translucent spirit body
  smoothChainPath(ctx, joints);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(198, 208, 255, 0.20)";
  ctx.lineWidth = width;
  ctx.stroke();
  // Inner light core
  smoothChainPath(ctx, joints);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.10 + shimmer * 0.08})`;
  ctx.lineWidth = Math.max(2, width * 0.42);
  ctx.stroke();
  ctx.restore();
}

export function drawVirtualHand(
  ctx: CanvasRenderingContext2D,
  p: ScreenPoint[],
  hand: TrackedHand,
  now: number,
  activeMode: "pen" | "grab" | "tap",
) {
  const palmWidth = Math.max(24, Math.hypot(p[17].x - p[5].x, p[17].y - p[5].y));
  const center: ScreenPoint = {
    x: (p[0].x + p[5].x + p[9].x + p[13].x + p[17].x) / 5,
    y: (p[0].y + p[5].y + p[9].y + p[13].y + p[17].y) / 5,
    z: p[9].z,
  };
  const side = unit(p[5], p[17]);
  const down = unit(p[9], p[0]);
  const shimmer = 0.5 + 0.5 * Math.sin(now * 0.0032);

  const wristEnd = { x: p[0].x + down.x * palmWidth * 0.3, y: p[0].y + down.y * palmWidth * 0.3 };
  const wl = { x: wristEnd.x - side.x * palmWidth * 0.3, y: wristEnd.y - side.y * palmWidth * 0.3 };
  const wr = { x: wristEnd.x + side.x * palmWidth * 0.3, y: wristEnd.y + side.y * palmWidth * 0.3 };

  // 1. Ambient halo so the spirit hand floats out of the dark
  const halo = ctx.createRadialGradient(center.x, center.y, palmWidth * 0.2, center.x, center.y, palmWidth * 1.9);
  halo.addColorStop(0, "rgba(190, 200, 255, 0.16)");
  halo.addColorStop(0.55, "rgba(170, 180, 255, 0.07)");
  halo.addColorStop(1, "rgba(170, 180, 255, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(center.x, center.y, palmWidth * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // 2. Translucent palm veil
  const tracePalm = () => {
    ctx.beginPath();
    ctx.moveTo(wl.x, wl.y);
    ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y);
    ctx.quadraticCurveTo(p[5].x, p[5].y - palmWidth * 0.04, p[9].x, p[9].y - palmWidth * 0.05);
    ctx.quadraticCurveTo(p[13].x, p[13].y, p[17].x, p[17].y);
    ctx.quadraticCurveTo((p[17].x + wr.x) / 2, (p[17].y + wr.y) / 2, wr.x, wr.y);
    ctx.quadraticCurveTo(
      wristEnd.x + down.x * palmWidth * 0.12,
      wristEnd.y + down.y * palmWidth * 0.12,
      wl.x,
      wl.y,
    );
    ctx.closePath();
  };
  ctx.save();
  tracePalm();
  ctx.fillStyle = "rgba(196, 206, 255, 0.13)";
  ctx.fill();
  ctx.strokeStyle = `rgba(240, 244, 255, ${0.38 + shimmer * 0.14})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 11;
  ctx.stroke();
  ctx.restore();

  // 3. Ghost fingers — slim tubes so two hands can meet without visual collision
  const widths = [0.128, 0.134, 0.138, 0.128, 0.11];
  const chains = [
    [p[0], p[1], p[2], p[3], p[4]],
    [p[5], p[6], p[7], p[8]],
    [p[9], p[10], p[11], p[12]],
    [p[13], p[14], p[15], p[16]],
    [p[17], p[18], p[19], p[20]],
  ];
  chains.forEach((joints, i) => drawGhostFinger(ctx, joints, palmWidth * widths[i], shimmer));

  // 4. Delicate skeleton light-lines — fingers plus a short knuckle arc.
  // (No long wrist-to-knuckle diagonals: they read as stray spokes.)
  const FINGER_SKELETON = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ];
  const PALM_SKELETON: [number, number][] = [
    [0, 1],
    [5, 9],
    [9, 13],
    [13, 17],
  ];
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 6;
  for (const chain of FINGER_SKELETON) {
    ctx.beginPath();
    ctx.moveTo(p[chain[0]].x, p[chain[0]].y);
    for (let i = 1; i < chain.length; i++) ctx.lineTo(p[chain[i]].x, p[chain[i]].y);
    ctx.stroke();
  }
  for (const [a, b] of PALM_SKELETON) {
    ctx.beginPath();
    ctx.moveTo(p[a].x, p[a].y);
    ctx.lineTo(p[b].x, p[b].y);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Star joints — glowing orbs on all 21 landmarks, starbursts on fingertips
  const jointR = Math.max(3, palmWidth * 0.045);
  for (let i = 0; i < 21; i++) {
    const pt = p[i];
    const isTip = TIP_IDS.has(i);
    const r = isTip ? jointR * 1.6 : jointR;
    const haloR = r * (isTip ? 4.2 : 3);
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, haloR);
    g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    g.addColorStop(0.35, "rgba(220, 228, 255, 0.55)");
    g.addColorStop(1, "rgba(200, 210, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    if (isTip) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      star(ctx, pt.x, pt.y, r * 2.1, now * 0.002 + i);
    }
  }

  // 6. Active-point glow for the current mode
  let focus: ScreenPoint | null = null;
  if (activeMode === "grab" && hand.pinch) {
    focus = mix(p[4], p[8], 0.5);
  } else if (activeMode === "pen" || activeMode === "tap") {
    focus = p[8];
  }
  if (focus) {
    const pulse = 0.85 + Math.sin(now * 0.007) * 0.15;
    const fr = palmWidth * 0.34 * pulse;
    const fg = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, fr);
    fg.addColorStop(0, "rgba(255, 246, 220, 0.9)");
    fg.addColorStop(0.45, "rgba(255, 200, 150, 0.35)");
    fg.addColorStop(1, "rgba(255, 200, 150, 0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(focus.x, focus.y, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 252, 240, 0.95)";
    star(ctx, focus.x, focus.y, palmWidth * 0.11 * pulse, now * 0.003);
  }
}

/* ------------------------------------------------------------------ *
 * Five unique 5-second charge styles, one per hand sign.
 * ------------------------------------------------------------------ */

export type ChargeStyle = "gift" | "bloom" | "candle" | "heart" | "years";

export const CHARGE_STYLE: Record<string, ChargeStyle> = {
  present: "gift",
  baby: "bloom",
  cake: "candle",
  heart: "heart",
  three: "years",
};

function chargeGift(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number) {
  // A real little gift box assembles above the hand: body, lid, ribbon, then a bow.
  const grow = 0.45 + p * 0.55;
  const w = r * 0.78 * grow;
  const h = r * 0.6 * grow;
  const lidH = h * 0.3;
  const bob = Math.sin(now * 0.0022) * r * 0.04;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(Math.sin(now * 0.0015) * 0.05);
  ctx.shadowColor = "rgba(255, 176, 210, 0.85)";
  ctx.shadowBlur = 18;

  // box body
  const bodyTop = -h / 2 + lidH;
  const bodyGrad = ctx.createLinearGradient(-w / 2, bodyTop, w / 2, h / 2);
  bodyGrad.addColorStop(0, "#ffd7ea");
  bodyGrad.addColorStop(0.5, "#ff9cc6");
  bodyGrad.addColorStop(1, "#e77aa8");
  ctx.globalAlpha = Math.min(1, 0.25 + p * 1.1);
  ctx.fillStyle = bodyGrad;
  roundRectPath(ctx, -w / 2, bodyTop, w, h - lidH, w * 0.08);
  ctx.fill();

  // lid
  const lidGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + lidH);
  lidGrad.addColorStop(0, "#fff2f8");
  lidGrad.addColorStop(1, "#ffb6d5");
  ctx.fillStyle = lidGrad;
  roundRectPath(ctx, -w * 0.57, -h / 2, w * 1.14, lidH, lidH * 0.4);
  ctx.fill();

  // vertical ribbon
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 240, 214, 0.95)";
  ctx.fillRect(-w * 0.09, -h / 2, w * 0.18, h);
  ctx.fillStyle = "rgba(255, 226, 170, 0.95)";
  ctx.fillRect(-w * 0.09, bodyTop, w * 0.18, h - lidH);

  // bow grows in last
  const bow = Math.max(0, Math.min(1, (p - 0.5) / 0.5));
  if (bow > 0) {
    ctx.save();
    ctx.translate(0, -h / 2);
    ctx.scale(bow, bow);
    ctx.fillStyle = "#ffd98c";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * w * 0.2, -w * 0.11, w * 0.19, w * 0.12, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff6de";
    ctx.beginPath();
    ctx.arc(0, -w * 0.06, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // sparkles orbiting the parcel
  for (let i = 0; i < 6; i++) {
    const a = now * 0.0019 + (i * Math.PI * 2) / 6;
    ctx.fillStyle = `rgba(255, 242, 218, ${0.25 + p * 0.55})`;
    star(ctx, x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 0.8, 4 + p * 3.5, a);
  }
}

function chargeBloom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number) {
  // Petals unfurl one by one around the hand.
  const petals = 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(now * 0.0006);
  for (let i = 0; i < petals; i++) {
    const appear = Math.max(0, Math.min(1, p * petals - i));
    if (appear <= 0) continue;
    const a = (i * Math.PI * 2) / petals;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.62 * appear);
    ctx.scale(appear, appear);
    const g = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.1);
    g.addColorStop(0, "rgba(255, 236, 244, 0.95)");
    g.addColorStop(1, "rgba(255, 150, 194, 0.6)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.2, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = `rgba(255, 230, 170, ${0.5 + p * 0.5})`;
  ctx.shadowColor = "rgba(255, 216, 150, 0.9)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2 * (0.5 + p * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function chargeCandle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number) {
  // Candles light one by one, flames flickering.
  const count = 5;
  const lit = p * count;
  for (let i = 0; i < count; i++) {
    const cx = x + (i - (count - 1) / 2) * r * 0.42;
    const cy = y - r * 0.5;
    ctx.fillStyle = "rgba(255, 214, 232, 0.85)";
    ctx.fillRect(cx - 3, cy, 6, r * 0.5);
    const on = Math.max(0, Math.min(1, lit - i));
    if (on <= 0) continue;
    const flick = 1 + Math.sin(now * 0.02 + i * 2) * 0.16;
    const fr = 13 * on * flick;
    const g = ctx.createRadialGradient(cx, cy - 8, 0, cx, cy - 8, fr * 2.2);
    g.addColorStop(0, "rgba(255, 248, 214, 0.98)");
    g.addColorStop(0.35, "rgba(255, 198, 118, 0.7)");
    g.addColorStop(1, "rgba(255, 168, 110, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, fr * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 244, 190, 0.98)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 10, fr * 0.42, fr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(255, 226, 178, ${0.3 + p * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2 * p);
  ctx.stroke();
}

function chargeHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number) {
  // A heart draws itself and starts to beat.
  const beat = 1 + Math.sin(now * 0.008) * 0.07 * p;
  const s = r * 1.15 * beat * (0.45 + p * 0.55);
  ctx.save();
  ctx.globalAlpha = 0.28 + p * 0.5;
  const g = ctx.createRadialGradient(x, y, 0, x, y, s);
  g.addColorStop(0, "rgba(255, 150, 195, 0.85)");
  g.addColorStop(1, "rgba(255, 90, 150, 0)");
  ctx.fillStyle = g;
  heartPath(ctx, x, y + s * 0.1, s, 0);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(255, 240, 246, 0.95)";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "rgba(255, 150, 200, 0.95)";
  ctx.shadowBlur = 16;
  ctx.setLineDash([s * 4.4 * p, s * 9]);
  ctx.beginPath();
  ctx.save();
  ctx.translate(x, y + s * 0.1);
  ctx.scale(s / 16, s / 16);
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-9, -1, -9, -9, -3.4, -9);
  ctx.bezierCurveTo(-0.8, -9, 0, -6.6, 0, -5.4);
  ctx.bezierCurveTo(0, -6.6, 0.8, -9, 3.4, -9);
  ctx.bezierCurveTo(9, -9, 9, -1, 0, 6);
  ctx.restore();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  for (let i = 0; i < 6; i++) {
    const t = (now * 0.0006 + i / 6) % 1;
    ctx.fillStyle = `rgba(255, 190, 220, ${(1 - t) * p * 0.8})`;
    heartPath(ctx, x + Math.sin(i * 2.1 + now * 0.001) * r * 0.7, y - t * r * 1.5, 9 * (1 - t * 0.5), 0);
  }
}

function chargeYears(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number) {
  // Three golden stars orbit and settle above the three fingers.
  ctx.save();
  ctx.strokeStyle = `rgba(255, 226, 168, ${0.25 + p * 0.45})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 9]);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const settle = Math.max(0, Math.min(1, p * 3 - i));
    const a = now * 0.0022 + (i * Math.PI * 2) / 3;
    const orbit = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.55 };
    const home = { x: x + (i - 1) * r * 0.55, y: y - r * 0.95 };
    const px = orbit.x + (home.x - orbit.x) * settle;
    const py = orbit.y + (home.y - orbit.y) * settle;
    ctx.save();
    ctx.shadowColor = "rgba(255, 214, 140, 0.95)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255, 238, 186, ${0.55 + settle * 0.45})`;
    star(ctx, px, py, 11 + settle * 6, now * 0.002 + i, 5);
    ctx.restore();
  }
  if (p > 0.7) {
    const a = (p - 0.7) / 0.3;
    ctx.fillStyle = `rgba(255, 246, 214, ${a})`;
    ctx.font = `600 ${Math.round(r * 0.5)}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillText("III", x, y + r * 0.2);
  }
}

export function drawCharge(
  ctx: CanvasRenderingContext2D,
  style: ChargeStyle,
  x: number,
  y: number,
  radius: number,
  progress: number,
  now: number,
) {
  if (progress <= 0) return;
  const p = Math.min(1, Math.max(0, progress));

  // Single-hand charms float just above the hand so the hand stays readable;
  // two-hand charms bloom in the open space between the hands.
  const single = style === "gift" || style === "bloom" || style === "years";
  const cy = single ? y - radius * 1.02 : y;
  const r = single ? radius * 0.78 : radius;

  const aura = ctx.createRadialGradient(x, cy, r * 0.2, x, cy, r * 1.7);
  aura.addColorStop(0, `rgba(255, 214, 190, ${0.1 + p * 0.18})`);
  aura.addColorStop(1, "rgba(255, 180, 210, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, cy, r * 1.7, 0, Math.PI * 2);
  ctx.fill();

  if (style === "gift") chargeGift(ctx, x, cy, r, p, now);
  else if (style === "bloom") chargeBloom(ctx, x, cy, r, p, now);
  else if (style === "candle") chargeCandle(ctx, x, cy, r, p, now);
  else if (style === "heart") chargeHeart(ctx, x, cy, r, p, now);
  else chargeYears(ctx, x, cy, r, p, now);

  // Shared progress ring so the hold is always readable.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, cy, r * 1.3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 240, 236, 0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, cy, r * 1.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
  const ring = ctx.createLinearGradient(x - r, cy - r, x + r, cy + r);
  ring.addColorStop(0, "#ffe6b4");
  ring.addColorStop(1, "#ff9ec4");
  ctx.strokeStyle = ring;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 214, 160, 0.9)";
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Particles
 * ------------------------------------------------------------------ */

export function drawSparkleParticles(ctx: CanvasRenderingContext2D, particles: SparkleParticle[]) {
  for (const p of particles) {
    const t = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = t;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    if (p.kind === "ring") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.9 - t), 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.6 * t;
      ctx.stroke();
    } else if (p.kind === "star") {
      ctx.fillStyle = p.color;
      star(ctx, p.x, p.y, p.size * (0.45 + t * 0.8), (1 - t) * 3);
    } else if (p.kind === "heart") {
      ctx.fillStyle = p.color;
      heartPath(ctx, p.x, p.y, p.size * (0.7 + t * 0.6), (p.spin ?? 0) + (1 - t) * 2);
    } else if (p.kind === "petal") {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.spin ?? 0) + (1 - t) * 5);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Soft glowing ring around a badge while it's pinched/grabbed — never draws
 * a separate icon (like a gift box) over the held badge.
 */
export function drawGrabHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  now: number,
) {
  ctx.save();
  const aura = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius * 1.45);
  aura.addColorStop(0, "rgba(255, 224, 198, 0.28)");
  aura.addColorStop(0.65, "rgba(255, 178, 214, 0.14)");
  aura.addColorStop(1, "rgba(255, 178, 214, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(now * 0.0014);
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 232, 194, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(255, 210, 165, 0.9)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.fillStyle = "rgba(255, 246, 220, 0.92)";
    star(ctx, Math.cos(a) * radius, Math.sin(a) * radius, 5, a);
  }
  ctx.restore();
}

/** Smooth circular progress lock-on ring around a hovered badge in Tap mode. */
export function drawTapHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  now: number,
) {
  const p = Math.min(1, Math.max(0, progress));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 240, 236, 0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
  ctx.strokeStyle = "#ffd9a8";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 214, 160, 0.9)";
  ctx.shadowBlur = 12;
  ctx.stroke();

  const tipA = -Math.PI / 2 + Math.PI * 2 * p;
  ctx.fillStyle = "#fff8e4";
  star(ctx, x + Math.cos(tipA) * radius, y + Math.sin(tipA) * radius, 6, now * 0.003);
  ctx.restore();
}

let offscreen: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;

/**
 * Hands render to an offscreen buffer so the wrist dissolves into true
 * transparency instead of ending in a hard edge.
 */
export function drawTrackedHands(
  ctx: CanvasRenderingContext2D,
  hands: TrackedHand[],
  width: number,
  height: number,
  aspect: number,
  now: number,
  activeMode: "pen" | "grab" | "tap",
) {
  const usable = hands.filter((h) => h.landmarks.length === 21);
  if (usable.length === 0) return;

  const main = ctx.canvas;
  if (!offscreen || !offCtx) {
    offscreen = document.createElement("canvas");
    offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
  }
  if (offscreen.width !== main.width || offscreen.height !== main.height) {
    offscreen.width = main.width;
    offscreen.height = main.height;
  }

  const transform = ctx.getTransform();
  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
  offCtx.setTransform(transform);

  const sorted = [...usable].sort((a, b) => b.landmarks[0].z - a.landmarks[0].z);
  const fades: { from: ScreenPoint; to: ScreenPoint; width: number }[] = [];

  for (const hand of sorted) {
    const pts = handPoints(hand, width, height, aspect);
    drawVirtualHand(offCtx, pts, hand, now, activeMode);
    const palmWidth = Math.max(20, Math.hypot(pts[17].x - pts[5].x, pts[17].y - pts[5].y));
    const down = unit(pts[9], pts[0]);
    fades.push({
      from: { x: pts[0].x - down.x * palmWidth * 0.05, y: pts[0].y - down.y * palmWidth * 0.05, z: 0 },
      to: { x: pts[0].x + down.x * palmWidth * 0.36, y: pts[0].y + down.y * palmWidth * 0.36, z: 0 },
      width: palmWidth,
    });
  }

  offCtx.save();
  offCtx.globalCompositeOperation = "destination-out";
  for (const f of fades) {
    const g = offCtx.createLinearGradient(f.from.x, f.from.y, f.to.x, f.to.y);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    offCtx.fillStyle = g;
    offCtx.fillRect(
      f.from.x - f.width * 3,
      f.from.y - f.width * 3,
      f.width * 6,
      f.width * 6,
    );
  }
  offCtx.restore();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
}

/**
 * Princess magic ribbon for Pen mode: follows her finger smoothly with a
 * glowing pastel-pink & starlight trail that tapers and disappears naturally.
 */
export function drawMagicTrails(
  ctx: CanvasRenderingContext2D,
  trails: Record<string, MagicTrailPoint[]>,
  width: number,
  height: number,
  now: number,
  maxAgeMs = 1450,
) {
  ctx.clearRect(0, 0, width, height);

  for (const id of Object.keys(trails)) {
    const list = trails[id].filter((pt) => now - pt.born < maxAgeMs);
    if (list.length === 0) {
      delete trails[id];
      continue;
    }
    trails[id] = list;
    if (list.length < 2) continue;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (b.born - a.born > 220 || Math.hypot(b.x - a.x, b.y - a.y) > 120) continue;

      const life = Math.max(0, 1 - (now - b.born) / maxAgeMs);
      const fade = life * life;
      const prev = i > 1 ? list[i - 2] : a;
      const midPrevX = (prev.x + a.x) / 2;
      const midPrevY = (prev.y + a.y) / 2;
      const midCurrX = (a.x + b.x) / 2;
      const midCurrY = (a.y + b.y) / 2;

      // 1. Soft dreamy pastel-pink aura
      ctx.beginPath();
      ctx.moveTo(midPrevX, midPrevY);
      ctx.quadraticCurveTo(a.x, a.y, midCurrX, midCurrY);
      ctx.strokeStyle = `rgba(255, 152, 208, ${fade * 0.36})`;
      ctx.lineWidth = Math.max(1.5, 14 * fade);
      ctx.stroke();

      // 2. Rose-gold luminous ribbon
      ctx.beginPath();
      ctx.moveTo(midPrevX, midPrevY);
      ctx.quadraticCurveTo(a.x, a.y, midCurrX, midCurrY);
      ctx.strokeStyle = `rgba(255, 220, 238, ${fade * 0.88})`;
      ctx.lineWidth = Math.max(1, 6.2 * fade);
      ctx.stroke();

      // 3. Pure starlight center filament
      ctx.beginPath();
      ctx.moveTo(midPrevX, midPrevY);
      ctx.quadraticCurveTo(a.x, a.y, midCurrX, midCurrY);
      ctx.strokeStyle = `rgba(255, 252, 246, ${fade * 0.94})`;
      ctx.lineWidth = Math.max(0.6, 2.4 * fade);
      ctx.stroke();

      // Tiny princess sparkles twinkling along the fresh ribbon
      if (i % 5 === 0 && life > 0.32) {
        const offset = ((i % 2 === 0 ? 1 : -1) * 9) * (1 - life * 0.4);
        ctx.fillStyle = i % 10 === 0 ? `rgba(255, 232, 178, ${fade * 0.9})` : `rgba(255, 244, 250, ${fade * 0.85})`;
        star(ctx, b.x + offset, b.y - offset * 0.6, 4.5 * life, now * 0.004 + i);
      }
    }

    // Glowing fairy-wand tip at the newest point
    const head = list[list.length - 1];
    const headLife = Math.max(0, 1 - (now - head.born) / maxAgeMs);
    if (headLife > 0.45) {
      const tipR = 16 * headLife;
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, tipR);
      glow.addColorStop(0, `rgba(255, 252, 240, ${headLife * 0.95})`);
      glow.addColorStop(0.45, `rgba(255, 184, 224, ${headLife * 0.55})`);
      glow.addColorStop(1, "rgba(255, 184, 224, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, tipR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 250, 244, ${headLife})`;
      star(ctx, head.x, head.y, 8 * headLife, now * 0.005);
    }

    ctx.restore();
  }
}
