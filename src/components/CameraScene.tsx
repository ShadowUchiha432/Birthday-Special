import { AnimatePresence, motion } from "framer-motion";
import { CameraOff, Hand, MousePointer2, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeByKind, type BadgeKind } from "./Badges";
import { WISHES } from "../lib/wishes";
import { HandTracker, matchesWish, type HandSample, type TrackedHand, type WishId } from "../lib/handTracking";
import {
  CHARGE_STYLE,
  drawCharge,
  drawGrabHalo,
  drawMagicTrails,
  drawSparkleParticles,
  drawTapHalo,
  drawTrackedHands,
  handPoints,
  type MagicTrailPoint,
  type SparkleParticle,
} from "../lib/handDrawing";
import { HandSmoother } from "../lib/handSmoothing";
import { sfx } from "../lib/sfx";
import { advanceHold, type HoldState } from "../lib/gestureHold";
import GestureIcon from "./GestureIcon";

type Mode = "pen" | "grab" | "tap";
type Phase = "waiting" | "signs" | "collected";
type CameraStatus = "starting" | "camera" | "live" | "error";
type Position = { x: number; y: number; vx: number; vy: number; scale: number; heldBy: string | null };
type Point = { x: number; y: number };

const HOLD_TIME = 5000;
const modeOptions = [
  { id: "pen" as const, label: "Pen", Icon: Wand2 },
  { id: "grab" as const, label: "Grab", Icon: Hand },
  { id: "tap" as const, label: "Tap", Icon: MousePointer2 },
];
const modeHints: Record<Mode, string> = {
  pen: "Wave one finger for a princess magic ribbon that softly disappears.",
  grab: "Pinch near a wish to carry it around.",
  tap: "Point at a wish and hold still to open it.",
};

/** Badges drift in the free band between the prompt and the dock on any viewport. */
function fitBounds(width: number, height: number) {
  const short = height < 540;
  const narrow = width < 680;
  const top = short ? 132 : narrow ? 224 : 262;
  const dock = short ? 108 : narrow ? 208 : 186;
  const bottom = Math.min(Math.max(top + 80, height - dock), height - 70);
  return { left: width * 0.05, top, right: width * 0.95, bottom };
}

function gestureCenter(hands: TrackedHand[], wishId: WishId, width: number, height: number, aspect: number) {
  if (hands.length >= 2 && (wishId === "cake" || wishId === "heart")) {
    const a = handPoints(hands[0], width, height, aspect)[9];
    const b = handPoints(hands[1], width, height, aspect)[9];
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      radius: Math.max(100, Math.min(175, Math.hypot(b.x - a.x, b.y - a.y) * 0.68)),
    };
  }
  const h = hands[0];
  if (!h) return { x: width / 2, y: height / 2, radius: 110 };
  const pts = handPoints(h, width, height, aspect);
  const palm = pts[9];
  const wrist = pts[0];
  return {
    x: palm.x,
    y: (palm.y + wrist.y) * 0.48,
    radius: Math.max(88, Math.min(145, Math.hypot(palm.x - wrist.x, palm.y - wrist.y) * 1.2)),
  };
}

function isFist(hand: TrackedHand) {
  const f = hand.fingers;
  if (f.index || f.middle || f.ring || f.pinky) return false;
  // All four fingers curled is also true for thumbs-up — require the thumb
  // to be tucked in as well (tip pulled close to the middle knuckle).
  const lm = hand.landmarks;
  if (lm.length < 21) return false;
  const palm = Math.hypot(lm[17].x - lm[5].x, lm[17].y - lm[5].y) || 1;
  const thumbTuck = Math.hypot(lm[4].x - lm[9].x, lm[4].y - lm[9].y);
  return thumbTuck < palm * 1.05;
}

export default function CameraScene({
  onCombine,
  cameraStream,
}: {
  onCombine: (kinds: BadgeKind[]) => void;
  cameraStream?: Promise<MediaStream> | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const penCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleRef = useRef<HandSample>({ hands: [], timestamp: 0, aspect: 4 / 3 });
  const positionsRef = useRef<Record<string, Position>>({});
  const badgeElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const badgesRef = useRef<BadgeKind[]>([]);
  const modeRef = useRef<Mode>("grab");
  const phaseRef = useRef<Phase>("waiting");
  const signIndexRef = useRef(0);
  const statusRef = useRef<CameraStatus>("starting");
  const initialStreamRef = useRef(cameraStream);
  const retryStreamRef = useRef<Promise<MediaStream> | null>(null);
  const holdRef = useRef<HoldState>({ lastValid: null, elapsed: 0 });
  const lastChargeStepRef = useRef(-1);
  const magicTrailsRef = useRef<Record<string, MagicTrailPoint[]>>({});
  const hoverRef = useRef<{ id: string | null; since: number; opened: boolean }>({ id: null, since: 0, opened: false });
  const dialogRef = useRef(false);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const lastTipRef = useRef<Record<string, Point>>({});
  const fistSinceRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>("starting");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [showTryNote, setShowTryNote] = useState(false);
  const [signIndex, setSignIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [matchingNow, setMatchingNow] = useState(false);
  const [badges, setBadges] = useState<BadgeKind[]>([]);
  const [mode, setMode] = useState<Mode>("grab");
  const [handsFound, setHandsFound] = useState(0);
  const [readBadge, setReadBadge] = useState<BadgeKind | null>(null);
  const [combinePrompt, setCombinePrompt] = useState(false);
  const [unlocked, setUnlocked] = useState<{ kind: BadgeKind; name: string } | null>(null);

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: `${(i * 37.7 + 11) % 100}%`,
        top: `${(i * 53.3 + 7) % 100}%`,
        size: 1 + ((i * 7) % 3),
        delay: `${-((i * 0.37) % 4)}s`,
        dur: `${2.2 + ((i * 13) % 30) / 10}s`,
        gold: i % 5 === 0,
      })),
    [],
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    dialogRef.current = Boolean(readBadge || combinePrompt);
  }, [readBadge, combinePrompt]);

  useEffect(() => {
    let alive = true;
    setStatus("starting");
    setError("");
    const providedStream = retryStreamRef.current ?? initialStreamRef.current;
    retryStreamRef.current = null;
    initialStreamRef.current = null;
    const tracker = new HandTracker(
      videoRef.current!,
      {
        onSample: (sample) => {
          sampleRef.current = sample;
        },
        onCamera: () => {
          if (alive) {
            sampleRef.current = { hands: [], timestamp: 0, aspect: 4 / 3 };
            setStatus("camera");
          }
        },
        onTracking: () => {
          if (alive) setStatus("live");
        },
        onFailure: (message) => {
          if (alive) {
            setError(message);
            setStatus("error");
            sampleRef.current = { hands: [], timestamp: 0, aspect: 4 / 3 };
          }
        },
      },
      providedStream,
    );
    tracker.start().catch(() => {
      // Failures are surfaced through onFailure with a user-facing message.
    });
    return () => {
      alive = false;
      tracker.stop();
    };
  }, [retry]);

  useEffect(() => {
    if (status !== "live" || phase !== "waiting") return;
    const timer = window.setTimeout(() => {
      setPhase("signs");
      setShowTryNote(true);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [status, phase]);

  useEffect(() => {
    if (!showTryNote) return;
    const timer = window.setTimeout(() => setShowTryNote(false), 3600);
    return () => window.clearTimeout(timer);
  }, [showTryNote]);

  useEffect(() => {
    if (phase !== "collected") return;
    const timer = window.setTimeout(() => setCombinePrompt(true), 2200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!unlocked) return;
    const timer = window.setTimeout(() => setUnlocked(null), 2600);
    return () => window.clearTimeout(timer);
  }, [unlocked]);

  useEffect(() => {
    let frame = 0;
    let previousTime = performance.now();
    let lastUiUpdate = 0;
    let previousHands = -1;
    let prevMatch = false;
    const smoother = new HandSmoother(1.15, 9.5, 3.2);
    let previousSmoothed: { hands: TrackedHand[]; timestamp: number } | null = null;

    const spawnBurst = (cx: number, cy: number) => {
      const palette = ["#fff7da", "#ff9ec4", "#ffd58e", "#ffd6e9", "#ffffff"];
      particlesRef.current.push(
        { x: cx, y: cy, vx: 0, vy: 0, life: 0.75, maxLife: 0.75, size: 75, color: "rgba(255, 224, 178, 0.9)", kind: "ring" },
        { x: cx, y: cy, vx: 0, vy: 0, life: 0.95, maxLife: 0.95, size: 115, color: "rgba(255, 168, 206, 0.8)", kind: "ring" },
      );
      for (let i = 0; i < 36; i++) {
        const angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.2;
        const speed = 75 + Math.random() * 195;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life: 0.7 + Math.random() * 0.65,
          maxLife: 1.25,
          size: i % 2 === 0 ? 7 + Math.random() * 6 : 3 + Math.random() * 3.5,
          color: palette[i % palette.length],
          kind: i % 2 === 0 ? "star" : "dot",
        });
      }
    };

    const draw = (now: number) => {
      const stage = stageRef.current;
      const handCanvas = handCanvasRef.current;
      const penCanvas = penCanvasRef.current;
      if (!stage || !handCanvas || !penCanvas) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      const sample = sampleRef.current;
      const fresh = statusRef.current === "live" && now - sample.timestamp < 500;
      const rawHands = fresh ? sample.hands : [];
      const hands = smoother.smooth(rawHands, now);

      // Temporal interpolation: blend the current smoothed sample with the
      // previous one so the ghost hands render at every animation frame,
      // even when the camera emits updates less often than the display refreshes.
      let renderedHands = hands;
      const latestTs = sample.timestamp;
      const previous = previousSmoothed;
      if (previous && latestTs > previous.timestamp + 2 && fresh) {
        const a = Math.min(1, Math.max(0, (now - previous.timestamp) / (latestTs - previous.timestamp)));
        renderedHands = hands.map((current) => {
          const previousHand = previous.hands.find((hand) => hand.id === current.id);
          if (!previousHand || previousHand.landmarks.length !== current.landmarks.length) return current;
          const landmarks = current.landmarks.map((point, index) => ({
            x: previousHand.landmarks[index].x + (point.x - previousHand.landmarks[index].x) * a,
            y: previousHand.landmarks[index].y + (point.y - previousHand.landmarks[index].y) * a,
            z: previousHand.landmarks[index].z + (point.z - previousHand.landmarks[index].z) * a,
          }));
          return { ...current, landmarks };
        });
      }
      previousSmoothed = fresh ? { hands, timestamp: latestTs || now } : null;
      const bounds = fitBounds(width, height);

      for (const canvas of [handCanvas, penCanvas]) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
          canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }

      if (renderedHands.length !== previousHands) {
        previousHands = renderedHands.length;
        setHandsFound(renderedHands.length);
      }

      // Fairy dust trailing the fingertips
      for (const hand of renderedHands) {
        const pts = handPoints(hand, width, height, sample.aspect);
        for (const tipIdx of [8, 12, 20]) {
          const tip = pts[tipIdx];
          const key = `${hand.id}-${tipIdx}`;
          const prev = lastTipRef.current[key];
          if (prev) {
            const moved = Math.hypot(tip.x - prev.x, tip.y - prev.y);
            if (moved > 1.6 && particlesRef.current.length < 130 && Math.random() < (tipIdx === 8 ? 0.42 : 0.2)) {
              particlesRef.current.push({
                x: tip.x + (Math.random() - 0.5) * 6,
                y: tip.y + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 18,
                vy: -14 - Math.random() * 20,
                life: 0.55 + Math.random() * 0.4,
                maxLife: 0.95,
                size: Math.random() < 0.4 ? 5.5 : 2.8,
                color: Math.random() < 0.5 ? "#ffe9be" : "#ffc0da",
                kind: Math.random() < 0.35 ? "star" : "dot",
              });
            }
          }
          lastTipRef.current[key] = { x: tip.x, y: tip.y };
        }
      }
      if (hands.length === 0) lastTipRef.current = {};

      // Fold-your-hand-to-hide: a held fist closes an open wish card
      if (dialogRef.current) {
        const fisting = renderedHands.length > 0 && renderedHands.every(isFist);
        if (fisting) {
          if (fistSinceRef.current === null) fistSinceRef.current = now;
          if (now - fistSinceRef.current > 900) {
            fistSinceRef.current = null;
            setReadBadge(null);
          }
        } else {
          fistSinceRef.current = null;
        }
      } else {
        fistSinceRef.current = null;
      }

      // Gesture match + unique 5s charge-up with ascending music-box ticks
      let spellCircle: { x: number; y: number; radius: number; progress: number } | null = null;
      if (phaseRef.current === "signs" && !dialogRef.current) {
        const wish = WISHES[signIndexRef.current];
        const matches = fresh && matchesWish(rawHands, wish.id, sample.aspect);
        if (matches !== prevMatch) {
          prevMatch = matches;
          setMatchingNow(matches);
          if (matches && lastChargeStepRef.current < 0) {
            lastChargeStepRef.current = 0;
            sfx.chargeTick(0);
          }
        }
        holdRef.current = advanceHold(holdRef.current, matches, now);
        const value = Math.min(holdRef.current.elapsed / HOLD_TIME, 1);
        if (holdRef.current.elapsed === 0) {
          lastChargeStepRef.current = -1;
        } else if (matches) {
          const step = Math.floor(holdRef.current.elapsed / 1000);
          if (step > lastChargeStepRef.current && step >= 1 && step <= 4) {
            lastChargeStepRef.current = step;
            sfx.chargeTick(step);
          }
        }
        if (now - lastUiUpdate > 65) {
          setProgress(value);
          lastUiUpdate = now;
        }
        if (value > 0.02 && renderedHands.length > 0) {
          const center = gestureCenter(renderedHands, wish.id, width, height, sample.aspect);
          spellCircle = { ...center, progress: value };
          if (matches && particlesRef.current.length < 140 && Math.random() < 0.45) {
            const angle = Math.random() * Math.PI * 2;
            const r = center.radius * (0.95 + Math.random() * 0.35);
            particlesRef.current.push({
              x: center.x + Math.cos(angle) * r,
              y: center.y + Math.sin(angle) * r,
              vx: -Math.cos(angle) * 28,
              vy: -Math.sin(angle) * 28,
              life: 0.55,
              maxLife: 0.55,
              size: 4.5,
              color: Math.random() < 0.5 ? "#ffe5aa" : "#ffadd1",
              kind: "star",
            });
          }
        }
        if (value >= 1 && matches && !badgesRef.current.includes(wish.badge)) {
          const spawn = gestureCenter(renderedHands, wish.id, width, height, sample.aspect);
          const sx = Math.max(bounds.left + 44, Math.min(bounds.right - 44, spawn.x));
          const sy = Math.max(bounds.top + 44, Math.min(bounds.bottom - 44, spawn.y));
          spawnBurst(sx, sy);
          sfx.success();
          positionsRef.current[wish.badge] = {
            x: sx,
            y: sy,
            vx: (signIndexRef.current % 2 ? -1 : 1) * (16 + signIndexRef.current * 3),
            vy: (signIndexRef.current % 2 ? 1 : -1) * 14,
            scale: 0.1,
            heldBy: null,
          };
          badgesRef.current = [...badgesRef.current, wish.badge];
          setBadges(badgesRef.current);
          setUnlocked({ kind: wish.badge, name: wish.name });
          holdRef.current = { lastValid: null, elapsed: 0 };
          lastChargeStepRef.current = -1;
          prevMatch = false;
          setMatchingNow(false);
          setProgress(0);
          if (signIndexRef.current === WISHES.length - 1) {
            phaseRef.current = "collected";
            setPhase("collected");
          } else {
            signIndexRef.current += 1;
            setSignIndex(signIndexRef.current);
          }
        }
      } else {
        holdRef.current = { lastValid: null, elapsed: 0 };
        lastChargeStepRef.current = -1;
        if (prevMatch) {
          prevMatch = false;
          setMatchingNow(false);
        }
      }

      // Advance particles
      const aliveParticles: SparkleParticle[] = [];
      for (const p of particlesRef.current) {
        p.life -= delta;
        if (p.life > 0) {
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.96;
          p.vy *= 0.96;
          aliveParticles.push(p);
        }
      }
      particlesRef.current = aliveParticles;

      // Floating badges
      for (const kind of badgesRef.current) {
        const position = positionsRef.current[kind];
        const element = badgeElementsRef.current[kind];
        if (!position || !element) continue;
        position.scale = Math.min(1, position.scale + delta * 3.2);
        const hand = renderedHands.find((h) => h.id === position.heldBy);
        if (modeRef.current === "grab" && hand?.pinch && !dialogRef.current) {
          const pts = handPoints(hand, width, height, sample.aspect);
          const index = pts[8];
          const thumb = pts[4];
          const targetX = (index.x + thumb.x) / 2;
          const targetY = (index.y + thumb.y) / 2;
          position.x += (targetX - position.x) * 0.55;
          position.y += (targetY - position.y) * 0.55;
        } else {
          position.heldBy = null;
          if (modeRef.current !== "tap" && !dialogRef.current) {
            position.x += position.vx * delta;
            position.y += position.vy * delta;
          }
          if (position.x < bounds.left + 36 || position.x > bounds.right - 36) position.vx *= -1;
          if (position.y < bounds.top + 36 || position.y > bounds.bottom - 36) position.vy *= -1;
          position.x = Math.max(bounds.left + 36, Math.min(bounds.right - 36, position.x));
          position.y = Math.max(bounds.top + 36, Math.min(bounds.bottom - 36, position.y));
        }
        const easeScale = 1 - Math.pow(1 - position.scale, 3);
        element.style.transform = `translate(${position.x}px, ${position.y}px) translate(-50%, -50%) scale(${easeScale})`;
      }

      if (!dialogRef.current && modeRef.current === "grab") {
        for (const hand of renderedHands) {
          if (!hand.pinch || Object.values(positionsRef.current).some((p) => p.heldBy === hand.id)) continue;
          const pts = handPoints(hand, width, height, sample.aspect);
          const index = pts[8];
          const thumb = pts[4];
          const point = { x: (index.x + thumb.x) / 2, y: (index.y + thumb.y) / 2 };
          let closest: Position | null = null;
          let nearest = 74;
          for (const kind of badgesRef.current) {
            const pos = positionsRef.current[kind];
            const distance = Math.hypot(pos.x - point.x, pos.y - point.y);
            if (!pos.heldBy && distance < nearest) {
              closest = pos;
              nearest = distance;
            }
          }
          if (closest) {
            closest.heldBy = hand.id;
            sfx.badgeTap();
          }
        }
      }

      // Princess magic ribbon in Pen mode — follows her finger and fades away naturally (no permanent marks).
      if (!dialogRef.current && modeRef.current === "pen") {
        for (const hand of renderedHands) {
          const f = hand.fingers;
          if (!f.index || f.middle || f.ring || f.pinky) continue;
          const point = handPoints(hand, width, height, sample.aspect)[8];
          const trail = magicTrailsRef.current[hand.id] ?? (magicTrailsRef.current[hand.id] = []);
          const last = trail[trail.length - 1];
          const moved = last ? Math.hypot(point.x - last.x, point.y - last.y) : 99;
          if (moved > 2.2) {
            trail.push({ x: point.x, y: point.y, born: now });
            if (trail.length > 90) trail.shift();
            if (moved > 4 && particlesRef.current.length < 130 && Math.random() < 0.55) {
              particlesRef.current.push({
                x: point.x + (Math.random() - 0.5) * 10,
                y: point.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 28,
                vy: -12 - Math.random() * 24,
                life: 0.65 + Math.random() * 0.4,
                maxLife: 1.05,
                size: Math.random() < 0.5 ? 6 : 3.2,
                color: Math.random() < 0.5 ? "#ffe9be" : "#ffb4d6",
                kind: Math.random() < 0.6 ? "star" : "dot",
              });
            }
          }
        }
      }
      const penCtx = penCanvas.getContext("2d");
      if (penCtx) {
        drawMagicTrails(penCtx, magicTrailsRef.current, width, height, now, 1450);
      }

      let tapLock: { x: number; y: number; progress: number } | null = null;
      if (!dialogRef.current && modeRef.current === "tap") {
        let near: BadgeKind | null = null;
        for (const hand of renderedHands) {
          const point = handPoints(hand, width, height, sample.aspect)[8];
          const kind = badgesRef.current.find(
            (id) => Math.hypot(positionsRef.current[id].x - point.x, positionsRef.current[id].y - point.y) < 52,
          );
          if (kind) {
            near = kind;
            break;
          }
        }
        if (hoverRef.current.id !== near) hoverRef.current = { id: near, since: now, opened: false };
        if (near) {
          const pos = positionsRef.current[near];
          const tapProg = Math.min(1, (now - hoverRef.current.since) / 1100);
          if (pos) tapLock = { x: pos.x, y: pos.y, progress: tapProg };
          if (!hoverRef.current.opened && tapProg >= 1) {
            hoverRef.current.opened = true;
            sfx.badgeTap();
            setReadBadge(near);
          }
        }
      } else if (modeRef.current !== "tap") {
        hoverRef.current = { id: null, since: 0, opened: false };
      }

      const handCtx = handCanvas.getContext("2d");
      if (handCtx) {
        handCtx.clearRect(0, 0, width, height);
        if (spellCircle) {
          drawCharge(
            handCtx,
            CHARGE_STYLE[WISHES[signIndexRef.current].id] ?? "gift",
            spellCircle.x,
            spellCircle.y,
            spellCircle.radius,
            spellCircle.progress,
            now,
          );
        }
        if (tapLock) {
          drawTapHalo(handCtx, tapLock.x, tapLock.y, 48, tapLock.progress, now);
        }
        for (const pos of Object.values(positionsRef.current)) {
          if (pos.heldBy) drawGrabHalo(handCtx, pos.x, pos.y, 50, now);
        }
        drawSparkleParticles(handCtx, particlesRef.current);
        drawTrackedHands(handCtx, renderedHands, width, height, sample.aspect, now, modeRef.current);
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  function retryCamera() {
    let request: Promise<MediaStream>;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        request = Promise.reject(new DOMException("Camera API is not available", "NotSupportedError"));
      } else {
        request = navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        });
      }
    } catch (err) {
      request = Promise.reject(err);
    }
    request.catch(() => {});
    retryStreamRef.current = request;
    setRetry((value) => value + 1);
  }

  function openInNewTab() {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  function openWish(kind: BadgeKind) {
    hoverRef.current = { id: kind, since: performance.now(), opened: true };
    setReadBadge(kind);
  }

  const wish = WISHES[signIndex];
  const readWish = WISHES.find((w) => w.badge === readBadge) ?? null;
  const readIndex = readWish ? WISHES.findIndex((w) => w.badge === readBadge) : -1;

  return (
    <main className="camera-screen night">
      <div className="camera-starfield" aria-hidden="true">
        {stars.map((s, i) => (
          <i
            key={i}
            className={s.gold ? "camera-star gold" : "camera-star"}
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.dur,
            }}
          />
        ))}
      </div>
      <div className="camera-atmosphere" />

      <div className="camera-heading">
        <p className="eyebrow">
          <Sparkles size={12} /> MADE SLOWLY, WITH ALL MY LOVE, BABE
        </p>
        {phase === "waiting" ? (
          <h1>
            Babe, let your hands <em>make magic.</em>
          </h1>
        ) : (
          <h1>
            Five wishes, babe, <em>made with love.</em>
          </h1>
        )}
      </div>

      {status === "live" && phase === "signs" && (
        <div
          className={`gesture-prompt ${matchingNow ? "gesture-matched" : ""}`}
          key={wish.id}
          onClick={() => sfx.chargeTick(Math.min(4, Math.max(0, Math.floor(progress * 5))))}
        >
          <span className="gesture-emoji" aria-label={wish.emoji}>
            <GestureIcon kind={wish.id} size={40} />
          </span>
          <div className="gesture-copy">
            <span className="gesture-status-label">
              {matchingNow ? (
                <>
                  <Sparkles size={10} /> SIGN DETECTED — HOLD STEADY
                </>
              ) : (
                `WISH ${String(signIndex + 1).padStart(2, "0")} OF 05`
              )}
            </span>
            <strong>{wish.name}</strong>
            <p>{wish.instruction}</p>
            <div className="hold-row">
              <div className="hold-track">
                <i style={{ width: `${progress * 100}%` }} />
              </div>
              <small>{progress > 0 ? `${Math.min(5, Math.floor(progress * 5))} / 5s` : "Hold for 5s"}</small>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen spirit stage: ghost hands roam the whole screen */}
      <div ref={stageRef} className="magic-stage">
        {phase === "waiting" && status === "live" && (
          <div className="stage-welcome">
            <Sparkles size={22} />
            <span>Wave hello, babe</span>
            <small>Your spirit hands follow every finger. The first wish is on its way, just for you.</small>
          </div>
        )}
        {status === "starting" && (
          <div className="stage-welcome">
            <div className="loading-ring" />
            <span>Turning on your camera</span>
            <small>Tap “Allow” when your browser asks for camera permission.</small>
          </div>
        )}
        {status === "camera" && (
          <div className="stage-welcome">
            <div className="loading-ring" />
            <span>Your camera is on</span>
            <small>Waking up the hand magic. This can take a few seconds on the first visit.</small>
          </div>
        )}
        <canvas ref={penCanvasRef} className="magic-canvas pen-canvas" />
        {badges.map((kind) => (
          <button
            key={kind}
            ref={(element) => {
              badgeElementsRef.current[kind] = element;
            }}
            className="floating-wish"
            aria-label={`Read ${WISHES.find((w) => w.badge === kind)?.name} wish`}
            onClick={() => openWish(kind)}
          >
            <span className="floating-wish-inner">
              <BadgeByKind kind={kind} size={86} />
            </span>
          </button>
        ))}
        <canvas
          ref={handCanvasRef}
          className="magic-canvas hand-canvas"
          aria-label="Virtual hands following your movements"
        />

        <AnimatePresence>
          {showTryNote && (
            <motion.div
              className="try-signs-toast"
              initial={{ opacity: 0, x: "-50%", y: -12, scale: 0.94 }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: -12, scale: 0.94 }}
            >
              <Sparkles size={15} /> Try the signs now, babe — I made each one for you
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {unlocked && (
            <motion.div
              className="unlocked-forge-banner"
              initial={{ opacity: 0, x: "-50%", y: 20, scale: 0.72 }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: -18, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <div className="forge-badge-glow">
                <BadgeByKind kind={unlocked.kind} size={56} />
              </div>
              <div className="forge-text">
                <span>
                  <Sparkles size={12} /> WISH CREATED
                </span>
                <strong>{unlocked.name}</strong>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "collected" && (
        <button className="combine-again" onClick={() => setCombinePrompt(true)}>
          <Sparkles size={14} /> Ready to combine your wishes?
        </button>
      )}

      {/* Bottom dock: wish signs · modes · round selfie — like the reference */}
      <div className="camera-dock">
        <div className="wish-dock" aria-label="Your five wishes">
          {WISHES.map((w, i) => {
            const earned = badges.includes(w.badge);
            const current = phase === "signs" && i === signIndex && !earned;
            return (
              <button
                key={w.id}
                className={`wish-dot ${earned ? "earned" : "locked"} ${current ? "current" : ""}`}
                data-own-sfx={earned ? undefined : "true"}
                aria-label={earned ? `Read ${w.name}` : `Play ${w.name} chime`}
                onClick={() => {
                  if (earned) {
                    openWish(w.badge);
                  } else {
                    sfx.chargeTick(i);
                  }
                }}
                title={w.name}
              >
                <GestureIcon kind={w.id} size={19} />
              </button>
            );
          })}
        </div>

        <div className="dock-center">
          <div className="mode-bar" aria-label="Choose a hand interaction mode">
            {modeOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                aria-pressed={mode === id}
                className={mode === id ? "active" : ""}
                onClick={() => setMode(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <p className="mode-hint">{modeHints[mode]}</p>
        </div>

        <div className="dock-self">
          <div
            className="self-view round"
            onClick={() => {
              videoRef.current?.play().catch(() => {});
            }}
          >
            <video ref={videoRef} autoPlay muted playsInline />
          </div>
          <span className="camera-live">
            <i className={status === "live" ? "live-dot" : ""} />{" "}
            {status === "live"
              ? `${handsFound} ${handsFound === 1 ? "hand" : "hands"}`
              : status === "camera"
                ? "camera ready"
                : status === "starting"
                  ? "starting…"
                  : "paused"}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {status === "error" && (
          <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="love-dialog" initial={{ y: 30, scale: 0.94 }} animate={{ y: 0, scale: 1 }}>
              <div className="dialog-icon">
                <CameraOff size={22} />
              </div>
              <p className="eyebrow">LET'S TRY AGAIN</p>
              <h2>
                Let's get your
                <br />
                <em>camera on.</em>
              </h2>
              <p>{error}</p>
              <ul className="dialog-help">
                <li>
                  Tap the camera/lock icon in your browser's address bar and set Camera to <b>Allow</b>.
                </li>
                <li>Close other apps or tabs that may already be using the camera.</li>
                <li>If this page is in a preview window, open it in a new tab so the camera isn't blocked.</li>
              </ul>
              <p className="dialog-caption">The wishes appear only for your real hand signs, babe — nothing here is recorded.</p>
              <div className="dialog-actions">
                <button className="primary-button" onClick={retryCamera}>
                  Try camera again
                </button>
                <button className="text-button" onClick={openInNewTab}>
                  Open in a new tab
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}

        {readBadge && readWish && (
          <motion.div
            className="dialog-backdrop wish-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReadBadge(null)}
          >
            <motion.section
              className="wish-card"
              initial={{ y: 34, scale: 0.92, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 210, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="wish-close" onClick={() => setReadBadge(null)} aria-label="Close wish">
                <X size={16} />
              </button>
              <div className="wish-card-badge">
                <BadgeByKind kind={readBadge} size={118} />
              </div>
              <p className="wish-card-eyebrow">✦ WISH {readIndex + 1} · JUST FOR YOU, BABE ✦</p>
              <h2 className="wish-card-title">{readWish.name}</h2>
              <div className="wish-card-rule" />
              <p className="wish-card-message">{readWish.message}</p>
              <p className="wish-card-sub">Kept safe for you, babe, from my heart. — Rex</p>
              <div className="wish-card-heart" aria-hidden="true">
                ♡
              </div>
              <p className="wish-card-hint">TOUCH IT — OR FOLD YOUR HAND OVER IT TO HIDE IT INSIDE ♡</p>
              <div className="wish-card-bar">
                <i style={{ width: `${((readIndex + 1) / WISHES.length) * 100}%` }} />
              </div>
            </motion.section>
          </motion.div>
        )}

        {combinePrompt && (
          <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="love-dialog" initial={{ y: 30, scale: 0.94 }} animate={{ y: 0, scale: 1 }}>
              <div className="dialog-icon">
                <Sparkles size={22} />
              </div>
              <p className="eyebrow">YOU FOUND EVERY WISH</p>
              <h2>
                Ready to combine
                <br />
                <em>everything into one?</em>
              </h2>
              <p>Your five wishes, babe, are about to become one little star — grown from my love, held by your hands.</p>
              <div className="dialog-actions">
                <button className="primary-button" onClick={() => onCombine(badges)}>
                  Yes, combine them for me
                </button>
                <button className="text-button" onClick={() => setCombinePrompt(false)}>
                  Not yet, babe — let me play more
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
