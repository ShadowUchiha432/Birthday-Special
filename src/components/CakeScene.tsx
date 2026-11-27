import { Camera, Check, Download, Mic, MicOff, Move, Sparkles, Wind, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Celebration from "./Celebration";
import { sfx } from "../lib/sfx";
import {
  captureCakeKeepsake,
  triggerPhotoDownload,
  uploadKeepsakeToGitHub,
  type GitHubUploadResult,
} from "../lib/keepsake";

const CANDLES = [
  { x: 66, h: 34, c: "#ff7fae" },
  { x: 84, h: 44, c: "#ffd166" },
  { x: 100, h: 52, c: "#ff7fae" },
  { x: 116, h: 44, c: "#b79bff" },
  { x: 134, h: 34, c: "#ffd166" },
];

type MicState = "idle" | "listening" | "unavailable";
type SnapState = "idle" | "countdown" | "capturing" | "skipped";

/** Classic skin-color test on a low-res frame — enough to sense closeness + position. */
function skinStats(data: Uint8ClampedArray, w: number, h: number) {
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  const step = 4;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * step;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 85 && g > 30 && b > 15 && r > g + 8 && r > b + 8 && r - g < 110) {
        count++;
        sumX += x;
        sumY += y;
      }
    }
  }
  const total = (w / 2) * (h / 2);
  return {
    ratio: total ? count / total : 0,
    cx: count ? sumX / count / w : 0.5,
    cy: count ? sumY / count / h : 0.5,
  };
}

export default function CakeScene() {
  const stageRef = useRef<HTMLElement>(null);
  const cakeWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cakeSvgRef = useRef<SVGSVGElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const memoriesActiveRef = useRef(false);
  const captureBusyRef = useRef(false);
  const shotNumberRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const healthRef = useRef<number[]>(CANDLES.map(() => 1));
  const leanRef = useRef(0);
  const proxRef = useRef({ ratio: 0, cx: 0.5, close: false });
  const frameRef = useRef(0);
  const lastUiRef = useRef(0);
  // Localhost-only test hook (invisible in normal use): window.__cakeTestBlow = 0..1
  const testBlowRef = useRef(0);

  const [cameraState, setCameraState] = useState<"loading" | "live" | "error">("loading");
  const [cameraError, setCameraError] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [lit, setLit] = useState<boolean[]>(CANDLES.map(() => true));
  const [blow, setBlow] = useState(0);
  const [close, setClose] = useState(0);
  const [isClose, setIsClose] = useState(false);
  const [followX, setFollowX] = useState(0);
  const [done, setDone] = useState(false);
  const [snapState, setSnapState] = useState<SnapState>("idle");
  const [countdown, setCountdown] = useState(10);
  const [flash, setFlash] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubUploadResult | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [shotCount, setShotCount] = useState(0);
  const [documentHidden, setDocumentHidden] = useState(() => typeof document !== "undefined" && document.visibilityState === "hidden");

  const litCount = lit.filter(Boolean).length;

  /* ---------------- camera + microphone ---------------- */
  const startStream = useCallback(async (withAudio: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: withAudio
        ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        : false,
    });
    return stream;
  }, []);

  const attachAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (stream.getAudioTracks().length === 0) {
        setMicState("unavailable");
        return;
      }
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      ctx.resume().catch(() => {});
      setMicState("listening");
    } catch {
      setMicState("unavailable");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't open a camera or microphone.");
        setCameraState("error");
        setMicState("unavailable");
        return;
      }
      try {
        const stream = await startStream(true);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        }
        setCameraState("live");
        attachAnalyser(stream);
      } catch {
        // Camera-only fallback; mic can be retried from the UI.
        try {
          const stream = await startStream(false);
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(() => {});
          }
          setCameraState("live");
          setMicState("unavailable");
        } catch {
          if (!cancelled) {
            setCameraError("The camera couldn't start. Check your browser's camera permission and try again.");
            setCameraState("error");
            setMicState("unavailable");
          }
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [startStream, attachAnalyser]);

  /* Pause captures while hidden; the page resumes when she opens it again. */
  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const retryMic = useCallback(async () => {
    try {
      const micOnly = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      const track = micOnly.getAudioTracks()[0];
      if (!track) {
        setMicState("unavailable");
        return;
      }
      streamRef.current?.addTrack(track);
      attachAnalyser(streamRef.current ?? micOnly);
      if (!streamRef.current) streamRef.current = micOnly;
    } catch {
      setMicState("unavailable");
    }
  }, [attachAnalyser]);

  /* ---------------- proximity + blow loop ---------------- */
  useEffect(() => {
    if (done) return;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frameRef.current += 1;

      // Localhost test hook: lets automated checks simulate a real blow.
      if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname)) {
        const w = window as unknown as { __cakeTestBlow?: number; __cakeProx?: unknown };
        const v = w.__cakeTestBlow;
        if (typeof v === "number") testBlowRef.current = Math.max(0, Math.min(1, v));
        w.__cakeProx = { ratio: proxRef.current.ratio, close: proxRef.current.close };
      }

      // --- proximity sampling (~10fps) ---
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && frameRef.current % 6 === 0) {
        if (!sampleCanvasRef.current) sampleCanvasRef.current = document.createElement("canvas");
        const sc = sampleCanvasRef.current;
        sc.width = 96;
        sc.height = 54;
        const sctx = sc.getContext("2d", { willReadFrequently: true });
        if (sctx) {
          sctx.drawImage(video, 0, 0, 96, 54);
          const img = sctx.getImageData(0, 0, 96, 54);
          const s = skinStats(img.data, 96, 54);
          const p = proxRef.current;
          // Video is mirrored on screen, so flip x for the cake to follow her.
          const screenCx = 1 - s.cx;
          p.ratio += (s.ratio - p.ratio) * 0.3;
          p.cx += (screenCx - p.cx) * 0.3;
          // Hysteresis so the guide doesn't flicker at the boundary.
          if (!p.close && p.ratio > 0.075) p.close = true;
          else if (p.close && p.ratio < 0.05) p.close = false;
        }
      }

      // --- mic blow level (low-frequency breath energy) ---
      let level = 0;
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (analyser && data && micState === "listening") {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        let low = 0;
        let high = 0;
        const lowEnd = Math.floor(data.length * 0.12);
        for (let i = 1; i < lowEnd; i++) low += data[i];
        for (let i = lowEnd; i < data.length; i++) high += data[i];
        low /= Math.max(1, lowEnd - 1);
        high /= Math.max(1, data.length - lowEnd);
        const dominance = low / Math.max(12, high);
        level = Math.max(0, Math.min(1, (low / 165) * Math.min(1.35, dominance * 0.8)));
      }
      level = Math.max(level, testBlowRef.current);

      // Flames shiver with any breath, but only a CLOSE-UP blow can kill them.
      const closeNow = proxRef.current.close;
      leanRef.current += (level - leanRef.current) * Math.min(1, dt * 9);

      if (level > 0.3 && closeNow) {
        const health = healthRef.current;
        let changed = false;
        const order = [...CANDLES.keys()].sort(
          (a, b) => Math.abs(CANDLES[a].x - 100) - Math.abs(CANDLES[b].x - 100),
        );
        let budget = level * dt * 1.7;
        for (const i of order) {
          if (health[i] <= 0 || budget <= 0) continue;
          const spend = Math.min(budget, health[i]);
          health[i] -= spend;
          budget -= spend * 0.55;
          if (health[i] <= 0) {
            health[i] = 0;
            changed = true;
          }
        }
        if (changed) {
          const next = health.map((h) => h > 0);
          setLit(next);
          if (next.every((v) => !v)) {
            sfx.gong();
            setDone(true);
          }
        }
      }

      // Throttled UI sync
      if (now - lastUiRef.current > 140) {
        lastUiRef.current = now;
        setBlow(leanRef.current);
        const closeness = Math.max(0, Math.min(1, (proxRef.current.ratio - 0.015) / 0.06));
        setClose(closeness);
        setIsClose(closeNow);
        setFollowX(Math.max(-70, Math.min(70, (proxRef.current.cx - 0.5) * 150)));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [done, micState]);

  /* An explicit opt-in starts a visible, cancellable 10-second memory loop. */
  const takeKeepsake = useCallback(async () => {
    if (!memoriesActiveRef.current || captureBusyRef.current) return;
    if (!videoRef.current || videoRef.current.readyState < 2) {
      setGithubStatus({ status: "error", message: "Camera is not ready. Please try again." });
      memoriesActiveRef.current = false;
      setSnapState("skipped");
      return;
    }
    captureBusyRef.current = true;
    setSnapState("capturing");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 550);
    try {
      const index = shotNumberRef.current + 1;
      const { blob, url } = await captureCakeKeepsake(videoRef.current, cakeSvgRef.current, stageRef.current, index);
      if (!memoriesActiveRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = url;
      setPhotoUrl(url);
      shotNumberRef.current = index;
      setShotCount(index);
      sfx.success();
      triggerPhotoDownload(url, `birthday-memory-${String(index).padStart(2, "0")}.png`);
      void uploadKeepsakeToGitHub(blob, `birthday-memory-${String(index).padStart(2, "0")}.png`)
        .then((result) => {
          if (memoriesActiveRef.current) setGithubStatus(result);
        });
      setCountdown(10);
      setSnapState("countdown");
    } catch {
      memoriesActiveRef.current = false;
      setGithubStatus({ status: "error", message: "Photo could not be created." });
      setSnapState("skipped");
    } finally {
      captureBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      memoriesActiveRef.current = false;
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setSnapState("idle"), 1500);
    return () => window.clearTimeout(t);
  }, [done]);

  useEffect(() => {
    if (snapState !== "countdown" || documentHidden) return;
    if (countdown <= 0) {
      takeKeepsake();
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [snapState, countdown, takeKeepsake, documentHidden]);

  function startMemories() {
    if (cameraState !== "live") {
      setGithubStatus({ status: "error", message: "Camera is unavailable. Allow access and try again." });
      return;
    }
    memoriesActiveRef.current = true;
    setGithubStatus(null);
    setCountdown(10);
    setSnapState("countdown");
  }

  function stopMemories() {
    memoriesActiveRef.current = false;
    setSnapState("skipped");
  }

  const nextMemory = shotCount + 1 === 1 ? "full-screen memory" : shotCount + 1 === 2 ? "birthday portrait" : "face-only close-up";
  const lean = Math.round(blow * 30);
  const cakeScale = 0.94 + close * 0.24;

  return (
    <main ref={stageRef} className={`cake-scene ${done ? "cake-done" : ""}`}>
      <div className="cake-camera">
        <video ref={videoRef} autoPlay muted playsInline />
        <div className="cake-camera-tint" />
        {cameraState === "loading" && (
          <div className="cake-camera-note">
            <div className="loading-ring" />
            <span>Setting up your cake…</span>
          </div>
        )}
        {cameraState === "error" && (
          <div className="cake-camera-note">
            <Sparkles size={22} />
            <span>Your cake is waiting</span>
            <small>{cameraError}</small>
          </div>
        )}
      </div>

      {/* Face-framing guide: fills green when she's close enough to blow */}
      {cameraState === "live" && !done && (
        <div className={`cake-guide ${isClose ? "ready" : ""}`} aria-hidden="true">
          <span>{isClose ? "Perfect — now blow!" : "Move closer"}</span>
        </div>
      )}

      {/* Proper two-tier birthday cake that follows her across the frame */}
      <div
        ref={cakeWrapRef}
        className="cake-filter follow"
        style={{ transform: `translateX(calc(-50% + ${followX}px)) scale(${cakeScale})` }}
      >
        <div className="cake-glow" aria-hidden="true" />
        <svg ref={cakeSvgRef} viewBox="0 0 200 168" className="cake-svg" aria-label="Birthday cake with candles" role="img">
          <defs>
            <linearGradient id="ck-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffc7da" />
              <stop offset="1" stopColor="#f28bb4" />
            </linearGradient>
            <linearGradient id="ck-bottom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b3a4f5" />
              <stop offset="1" stopColor="#7c63d8" />
            </linearGradient>
            <linearGradient id="ck-icing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#ffe9f2" />
            </linearGradient>
            <linearGradient id="ck-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe9b8" />
              <stop offset="1" stopColor="#d9a94e" />
            </linearGradient>
            <radialGradient id="ck-flame" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
              <stop offset="0.4" stopColor="#ffb469" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ff9a5c" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* candles (striped, seated into the icing) */}
          {CANDLES.map((c, i) => {
            const baseY = 62;
            const topY = baseY - c.h;
            const isLit = lit[i];
            return (
              <g key={i}>
                <rect x={c.x - 3.4} y={topY} width="6.8" height={c.h + 3} rx="3" fill="#fff6f8" />
                {[0.18, 0.42, 0.66, 0.9].map((t, s) => (
                  <polygon
                    key={s}
                    points={`${c.x - 3.4},${topY + c.h * t} ${c.x + 3.4},${topY + c.h * t - 5} ${c.x + 3.4},${topY + c.h * t - 1.4} ${c.x - 3.4},${topY + c.h * t + 3.6}`}
                    fill={c.c}
                    opacity="0.92"
                  />
                ))}
                <line x1={c.x} y1={topY} x2={c.x} y2={topY - 3.4} stroke="#5d3f33" strokeWidth="1.4" strokeLinecap="round" />
                {isLit ? (
                  <g
                    className="candle-flame"
                    style={{
                      transformOrigin: `${c.x}px ${topY - 3}px`,
                      transform: `rotate(${lean + (i % 2 ? 2 : -2)}deg) scaleY(${1 - blow * 0.36}) scaleX(${1 + blow * 0.14})`,
                    }}
                  >
                    <ellipse cx={c.x} cy={topY - 10} rx="11" ry="13" fill="url(#ck-flame)" opacity="0.9" />
                    <path
                      d={`M${c.x} ${topY - 20}
                          C${c.x + 5} ${topY - 13} ${c.x + 4} ${topY - 4} ${c.x} ${topY - 3.2}
                          C${c.x - 4} ${topY - 4} ${c.x - 5} ${topY - 13} ${c.x} ${topY - 20} Z`}
                      fill="#ffbe5a"
                    />
                    <path
                      d={`M${c.x} ${topY - 14}
                          C${c.x + 2.4} ${topY - 9.5} ${c.x + 2} ${topY - 4.4} ${c.x} ${topY - 4}
                          C${c.x - 2} ${topY - 4.4} ${c.x - 2.4} ${topY - 9.5} ${c.x} ${topY - 14} Z`}
                      fill="#fff7dc"
                    />
                  </g>
                ) : (
                  <g className="candle-smoke">
                    <circle cx={c.x} cy={topY - 8} r="2.2" fill="#f3e6ee" opacity="0.55" />
                    <circle cx={c.x + 2.4} cy={topY - 15} r="3" fill="#f3e6ee" opacity="0.32" />
                    <circle cx={c.x - 2} cy={topY - 23} r="3.8" fill="#f3e6ee" opacity="0.16" />
                  </g>
                )}
              </g>
            );
          })}

          {/* top tier */}
          <rect x="58" y="62" width="84" height="30" rx="7" fill="url(#ck-top)" />
          <ellipse cx="100" cy="62" rx="42" ry="7" fill="#ffd9e7" />
          <path
            d="M58 66 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.2 -7 10.5 0 q5.3 -7 10.5 0 V58 H58 Z"
            fill="url(#ck-icing)"
          />
          {/* cherries */}
          {[70, 85, 100, 115, 130].map((x) => (
            <g key={x}>
              <circle cx={x} cy={56} r="4.6" fill="#ff5d8f" />
              <circle cx={x - 1.5} cy={54.4} r="1.4" fill="#fff" opacity="0.85" />
            </g>
          ))}

          {/* bottom tier */}
          <rect x="38" y="92" width="124" height="40" rx="9" fill="url(#ck-bottom)" />
          <ellipse cx="100" cy="92" rx="62" ry="8" fill="#c6b8f7" opacity="0.7" />
          <path
            d="M38 98 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.2 -8 12.4 0 q6.3 -8 12.6 0 V88 H38 Z"
            fill="url(#ck-icing)"
          />
          {/* gold dots */}
          {[56, 74, 92, 108, 126, 144].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={i % 2 ? 112 : 118} r="2.6" fill="#ffd98e" />
              <circle cx={x - 0.8} cy={(i % 2 ? 112 : 118) - 0.8} r="0.8" fill="#fff8e2" />
            </g>
          ))}

          {/* gold plate */}
          <ellipse cx="100" cy="140" rx="76" ry="9" fill="url(#ck-plate)" />
          <ellipse cx="100" cy="137.5" rx="66" ry="6.5" fill="#fff3d2" />
        </svg>
      </div>

      <Celebration active={done} intensity={1.5} />

      {!done && (
        <div className="cake-hud">
          <p className="eyebrow">
            <Sparkles size={12} /> MAKE A WISH, BABE
          </p>
          <h1>
            Babe, blow out your <em>candles.</em>
          </h1>
          <p className="cake-instruction">
            {micState !== "listening"
              ? "Turn on your microphone, babe, so the cake can feel your breath."
              : !isClose
                ? "Come a little closer, babe — the cake leans in with you. Now take a breath…"
                : "Perfect, babe — now blow, long and steady!"}
          </p>

          <div className="cake-meters">
            <div className="meter-row">
              <span>
                <Move size={12} /> Closeness
              </span>
              <div className="blow-meter slim" role="progressbar" aria-label="Closeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(close * 100)}>
                <i className={isClose ? "ready" : ""} style={{ width: `${Math.min(100, close * 115)}%` }} />
              </div>
            </div>
            <div className="meter-row">
              <span>
                <Wind size={12} /> Breath
              </span>
              <div className="blow-meter" role="progressbar" aria-label="Breath strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(blow * 100)}>
                <i style={{ width: `${Math.min(100, blow * 130)}%` }} />
              </div>
            </div>
          </div>

          <div className="cake-status">
            <span className={`mic-chip ${micState === "listening" ? "on" : "off"}`}>
              {micState === "listening" ? <Mic size={13} /> : <MicOff size={13} />}
              {micState === "listening" ? "Listening for your breath" : "Mic needed"}
            </span>
            <span className={`mic-chip ${isClose ? "on" : "off"}`}>
              {isClose ? "In position ✓" : "Move closer"}
            </span>
            <span className="candle-chip">
              {litCount} {litCount === 1 ? "candle" : "candles"} left
            </span>
          </div>

          {micState !== "listening" && (
            <button className="primary-button" onClick={retryMic}>
              <Mic size={16} /> Allow microphone to blow
            </button>
          )}
        </div>
      )}

      {flash && <div className="cake-flash" aria-hidden="true" />}

      {done && (
        <div className="cake-finale">
          <p className="eyebrow">
            <Sparkles size={13} /> EVERY CANDLE IS OUT, BABE <Sparkles size={13} />
          </p>
          <h1 className="cake-finale-title">
            Happy Birthday{" "}
            <span className="nowrap">
              <em>babe</em> ^^
            </span>
          </h1>
          <p>
            I hope every wish you just made comes true, babe. I love you more than all the candles in this world — today and always.
            <svg className="inline-heart" viewBox="0 0 24 24" aria-label="love" role="img">
              <path d="M12 21C4.5 15.4 2 11.8 2 8.6 2 5.9 4.1 4 6.7 4c2 0 3.6 1.1 4.4 2.7h1.8C13.7 5.1 15.3 4 17.3 4 19.9 4 22 5.9 22 8.6c0 3.2-2.5 6.8-10 12.4Z" />
            </svg>
          </p>

          {snapState === "idle" && (
            <div className="keepsake-opt-in" role="group" aria-label="Birthday memory photos">
              <Camera size={19} aria-hidden="true" />
              <div>
                <strong>Babe, ready to keep this moment forever?</strong>
                <p>Start, and I'll save a photo every 10 seconds while this page is open: first the whole scene, then a birthday portrait, then just your beautiful face. Each one downloads to your device and goes to my private GitHub, babe. Stop whenever you like.</p>
              </div>
              <div className="keepsake-opt-actions">
                <button className="keepsake-btn primary" onClick={startMemories}>Start memories</button>
                <button className="keepsake-btn" onClick={() => setSnapState("skipped")}>No thanks</button>
              </div>
            </div>
          )}

          {snapState === "countdown" && (
            <div className="keepsake-countdown" role="status" aria-live="polite">
              <div className="keepsake-ring">
                <span>{countdown}</span>
              </div>
              <div className="keepsake-copy">
                <strong>{documentHidden ? "Paused — come back to this tab, babe" : `Smile, babe! ${nextMemory} in ${countdown}s · ${shotCount} saved`}</strong>
                <small>{documentHidden ? "Nothing is being taken while you are away — it waits right here for you." : "I only capture these while you are watching, babe. Stop any time."}</small>
              </div>
              <div className="keepsake-actions">
                <button className="keepsake-btn primary" onClick={takeKeepsake}>
                  <Camera size={14} /> Snap now
                </button>
                <button className="keepsake-btn" onClick={stopMemories}>
                  Stop
                </button>
              </div>
            </div>
          )}

          {snapState === "capturing" && (
            <p className="keepsake-status" role="status">Creating your birthday keepsake...</p>
          )}

          {snapState === "skipped" && (
            <button className="keepsake-reopen" onClick={startMemories}>
              <Camera size={14} /> {shotCount ? "Start memories again" : "Start 10-second memories"}
            </button>
          )}
          {photoUrl && (
            <button className="keepsake-photo-link" onClick={() => setShowPhoto(true)}>
              <Download size={14} /> View and save latest photo ({shotCount})
            </button>
          )}
          {githubStatus?.status === "sent" && <p className="keepsake-upload-status">Latest photo saved to your GitHub repository.</p>}
          {githubStatus?.status === "unconfigured" && <p className="keepsake-upload-status">Local download only. GitHub upload needs server setup.</p>}
          {githubStatus?.status === "error" && <p className="keepsake-upload-status">GitHub upload: {githubStatus.message}</p>}
        </div>
      )}

      {showPhoto && photoUrl && (
        <div className="keepsake-modal-backdrop" onClick={() => setShowPhoto(false)}>
          <section className="keepsake-polaroid" onClick={(e) => e.stopPropagation()} aria-label="Your birthday keepsake photo">
            <button className="keepsake-close" onClick={() => setShowPhoto(false)} aria-label="Close photo">
              <X size={16} />
            </button>
            <div className="keepsake-frame">
              <img src={photoUrl} alt="Birthday wish keepsake" />
            </div>
            <p className="keepsake-caption">
              <Check size={14} /> Photo captured · download started
              {githubStatus?.status === "sent" && " · Saved to GitHub"}
              {githubStatus?.status === "unconfigured" && " · GitHub not connected"}
              {githubStatus?.status === "error" && " · GitHub upload failed"}
            </p>
            <div className="keepsake-polaroid-actions">
              <button className="primary-button" onClick={() => triggerPhotoDownload(photoUrl)}>
                <Download size={15} /> Save photo
              </button>
              {memoriesActiveRef.current && <button className="text-button" onClick={() => { stopMemories(); setShowPhoto(false); }}>Stop memories</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
