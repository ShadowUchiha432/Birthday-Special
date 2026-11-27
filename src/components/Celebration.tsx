import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "petal" | "heart" | "confetti";
  spin: number;
  spinSpeed: number;
};

const SPARK_COLORS = ["#ffd98e", "#ff9ec7", "#fff3d6", "#ff6fa5", "#c9a7ff", "#9be7d8"];
const PETAL_COLORS = ["#ffc6dd", "#ffd9e6", "#ffb3d1", "#ffe6ef", "#f7c8ff"];

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
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

/**
 * Canvas celebration layer: firework bursts plus a gentle rain of petals,
 * hearts and confetti. Runs a single rAF loop and cleans itself up.
 */
export default function Celebration({ active, intensity = 1 }: { active: boolean; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let last = performance.now();
    let nextBurst = 0;
    let nextRain = 0;
    const particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const burst = (x: number, y: number) => {
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      const count = 34 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 90 + Math.random() * 190;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0.9 + Math.random() * 0.7,
          max: 1.6,
          size: 2 + Math.random() * 2.4,
          color: Math.random() < 0.25 ? "#fff8e6" : color,
          kind: "spark",
          spin: 0,
          spinSpeed: 0,
        });
      }
      for (let i = 0; i < 6; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 1.2,
          max: 1.2,
          size: 12 + Math.random() * 8,
          color: "#ff8fb8",
          kind: "heart",
          spin: Math.random() * Math.PI,
          spinSpeed: (Math.random() - 0.5) * 2,
        });
      }
    };

    const rain = () => {
      const kindRoll = Math.random();
      const kind: Particle["kind"] = kindRoll < 0.5 ? "petal" : kindRoll < 0.78 ? "confetti" : "heart";
      particles.push({
        x: Math.random() * width,
        y: -20,
        vx: (Math.random() - 0.5) * 34,
        vy: 52 + Math.random() * 78,
        life: 9,
        max: 9,
        size: kind === "petal" ? 6 + Math.random() * 7 : 5 + Math.random() * 6,
        color: kind === "heart" ? "#ff9dc0" : PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        kind,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 3.2,
      });
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);

      if (activeRef.current) {
        if (now > nextBurst) {
          burst(width * (0.14 + Math.random() * 0.72), height * (0.1 + Math.random() * 0.42));
          nextBurst = now + (620 + Math.random() * 900) / Math.max(0.4, intensityRef.current);
        }
        if (now > nextRain) {
          rain();
          nextRain = now + 90 / Math.max(0.4, intensityRef.current);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }
        if (p.kind === "spark") {
          p.vy += 128 * dt;
          p.vx *= 0.975;
          p.vy *= 0.975;
        } else {
          p.vy += 12 * dt;
          p.vx += Math.sin((now + i * 90) * 0.0016) * 12 * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += p.spinSpeed * dt;

        const t = Math.max(0, Math.min(1, p.life / p.max));
        ctx.save();
        ctx.globalAlpha = p.kind === "spark" ? t : Math.min(1, t * 2.4);
        if (p.kind === "spark") {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "heart") {
          ctx.fillStyle = p.color;
          drawHeart(ctx, p.x, p.y, p.size, p.spin);
        } else if (p.kind === "petal") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.52, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.4, -p.size * 0.7, p.size * 0.8, p.size * 1.4);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />;
}
