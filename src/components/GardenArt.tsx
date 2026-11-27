import { memo, useEffect, useState, type CSSProperties, type PointerEvent } from "react";

export type SkyTime = "morning" | "evening" | "night";

type Plant = {
  x: number;
  y: number;
  height: number;
  scale: number;
  lean: number;
  kind: number;
  color: string;
  leaf: string;
  delay: number;
};

const colors = ["#f6a5ba", "#f8c3ce", "#e986a7", "#f5afc0", "#fbe0df", "#d9749a", "#f8d2d6"];
const leaves = ["#768b6c", "#879a77", "#a0a985", "#6e846b", "#a9aa84"];
const noise = (n: number) => {
  const value = Math.sin(n * 127.1 + 91.7) * 43758.5453;
  return value - Math.floor(value);
};

const plants: Plant[] = [
  ...Array.from({ length: 70 }, (_, i) => ({ i, layer: 0 })),
  ...Array.from({ length: 62 }, (_, i) => ({ i, layer: 1 })),
  ...Array.from({ length: 54 }, (_, i) => ({ i, layer: 2 })),
].map(({ i, layer }) => {
  const seed = i * 3 + layer * 241;
  const count = [70, 62, 54][layer];
  return {
    x: (i / (count - 1)) * 1490 - 25 + (noise(seed) - 0.5) * 25,
    y: [300, 390, 490][layer] + noise(seed + 1) * 38,
    height: [80, 133, 160][layer] + noise(seed + 2) * [80, 95, 116][layer],
    scale: [0.52, 0.76, 1.02][layer] * (0.76 + noise(seed + 3) * 0.52),
    lean: (noise(seed + 4) - 0.5) * 28,
    kind: Math.floor(noise(seed + 5) * 4),
    color: colors[Math.floor(noise(seed + 6) * colors.length)],
    leaf: leaves[Math.floor(noise(seed + 7) * leaves.length)],
    delay: -noise(seed + 8) * 6,
  };
});

function FlowerHead({ kind, color }: { kind: number; color: string }) {
  if (kind === 0) {
    return (
      <g>
        <path d="M-17 3 C-21-9 -18-23 -15-29 C-8-23 -4-19 0-17 C4-20 9-26 15-30 C19-20 21-9 16 3 C10 15 -10 15 -17 3Z" fill={color} stroke="#c9708f" strokeWidth=".8" />
        <path d="M-15-27 C-11-19 -7-11 0-6 C7-12 12-20 15-29 C15-14 10 2 0 7 C-10 2 -15-13 -15-27Z" fill="#f9cdd5" opacity=".65" />
        <path d="M0-17 C-3-12 -4-4 0 5" fill="none" stroke="#c97591" strokeWidth=".7" opacity=".6" />
      </g>
    );
  }
  const count = kind === 1 ? 10 : kind === 2 ? 7 : 8;
  const rx = kind === 1 ? 5 : kind === 2 ? 10.5 : 8;
  const ry = kind === 1 ? 17 : kind === 2 ? 19 : 16;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <ellipse key={i} cx="0" cy={-ry + 2} rx={rx} ry={ry} fill={color} stroke="#d98da1" strokeWidth=".55" transform={`rotate(${i * 360 / count})`} />
      ))}
      {kind !== 1 && Array.from({ length: count }, (_, i) => (
        <ellipse key={`inner-${i}`} cx="0" cy="-10" rx="4" ry="9" fill="#fff2e9" opacity=".34" transform={`rotate(${i * 360 / count + 10})`} />
      ))}
      <circle r={kind === 1 ? 6 : 7} fill="#e9b25c" />
      <circle r="3.8" fill="#f5d681" />
      <circle cx="-2" cy="-2" r="1" fill="#fff4c3" />
      <circle cx="2.5" cy="1" r=".8" fill="#c88842" />
    </g>
  );
}

function brushFlower(event: PointerEvent<SVGGElement>) {
  const plant = event.currentTarget;
  plant.classList.remove("brushed");
  void plant.getBoundingClientRect();
  plant.classList.add("brushed");
  window.setTimeout(() => plant.classList.remove("brushed"), 950);
}

const Meadow = memo(function Meadow({ interactive }: { interactive: boolean }) {
  return (
    <svg className={`meadow ${interactive ? "meadow-interactive" : ""}`} viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 280 Q200 215 420 278 T850 265 T1440 252 V520 H0Z" fill="#b0a994" opacity=".54" />
      <path d="M0 334 Q220 260 470 330 T990 310 T1440 324 V520 H0Z" fill="#a5a18a" opacity=".75" />
      <path d="M0 397 Q220 335 455 380 T930 372 T1440 380 V520 H0Z" fill="#849478" />
      {plants.map((plant, i) => (
        <g key={i} transform={`translate(${plant.x} ${plant.y})`}>
          <g
            className="meadow-plant"
            style={{ "--plant-delay": `${plant.delay}s`, "--plant-duration": `${4 + noise(i + 12) * 2.5}s`, "--gust-delay": `${((plant.x + 25) / 1500) * 1.1}s` } as CSSProperties}
            onPointerEnter={interactive ? brushFlower : undefined}
            onPointerDown={interactive ? brushFlower : undefined}
          >
            <path d={`M0 12 Q${plant.lean * 0.2} ${-plant.height * 0.48} ${plant.lean} ${-plant.height}`} fill="none" stroke={plant.leaf} strokeWidth={2.3 * plant.scale} strokeLinecap="round" />
            <path d={`M${plant.lean * 0.32} ${-plant.height * 0.35} Q${-24 * plant.scale} ${-plant.height * 0.58} ${-31 * plant.scale} ${-plant.height * 0.56} Q${-23 * plant.scale} ${-plant.height * 0.34} ${plant.lean * 0.32} ${-plant.height * 0.35}`} fill={plant.leaf} opacity=".9" />
            <path d={`M${plant.lean * 0.55} ${-plant.height * 0.58} Q${25 * plant.scale} ${-plant.height * 0.78} ${31 * plant.scale} ${-plant.height * 0.76} Q${24 * plant.scale} ${-plant.height * 0.57} ${plant.lean * 0.55} ${-plant.height * 0.58}`} fill={plant.leaf} opacity=".8" />
            {i % 6 === 0 && <path d={`M${plant.lean * 0.3} ${-plant.height * 0.45} Q${-16 * plant.scale} ${-plant.height * 0.64} ${-22 * plant.scale} ${-plant.height * 0.72}`} fill="none" stroke={plant.leaf} strokeWidth="1.4" />}
            {i % 6 === 0 && <ellipse cx={-22 * plant.scale} cy={-plant.height * 0.72} rx={4 * plant.scale} ry={8 * plant.scale} fill={plant.color} transform={`rotate(-28 ${-22 * plant.scale} ${-plant.height * 0.72})`} />}
            <g transform={`translate(${plant.lean} ${-plant.height}) scale(${plant.scale})`}>
              <FlowerHead kind={plant.kind} color={plant.color} />
            </g>
          </g>
        </g>
      ))}
      <path d="M0 507 Q230 479 440 505 T850 503 T1440 500 V520 H0Z" fill="#778c70" opacity=".8" />
    </svg>
  );
});

const Cloud = ({ className }: { className: string }) => (
  <svg className={`sky-cloud ${className}`} viewBox="0 0 560 130" fill="none" aria-hidden="true">
    <path d="M16 95C55 89 71 77 89 65C114 49 135 57 152 59C167 28 192 20 224 35C243 16 278 15 299 35C324 24 351 32 363 51C385 39 416 46 430 66C466 59 500 70 522 83C540 87 551 93 554 100C504 110 42 112 16 101C8 99 8 97 16 95Z" fill="currentColor" />
    <path d="M91 84C146 72 181 83 226 73C265 64 307 70 346 75C384 81 411 77 453 86" stroke="#fff" strokeOpacity=".48" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default function GardenArt({ time, interactive = false }: { time: SkyTime; interactive?: boolean }) {
  const [gusting, setGusting] = useState(false);

  // Seamless 5-second wind cadence for petals & wind streaks alongside the continuous CSS stem wave.
  useEffect(() => {
    let endTimer = 0;
    const trigger = () => {
      setGusting(true);
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(() => setGusting(false), 2600);
    };
    const first = window.setTimeout(trigger, 800);
    const interval = window.setInterval(trigger, 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      window.clearTimeout(endTimer);
    };
  }, []);

  return (
    <div className={`garden-art sky-${time} ${gusting ? "windy" : ""}`} aria-hidden="true">
      <div className="sky-layer morning-sky" />
      <div className="sky-layer evening-sky" />
      <div className="sky-layer night-sky" />
      <div className="sky-orb"><span /></div>
      <div className="sky-stars">
        {Array.from({ length: 45 }, (_, i) => <i key={i} style={{ left: `${noise(i + 20) * 100}%`, top: `${noise(i + 100) * 62}%`, animationDelay: `${-noise(i + 300) * 4}s` }} />)}
      </div>
      <Cloud className="cloud-one" />
      <Cloud className="cloud-two" />
      <Cloud className="cloud-three" />
      <Cloud className="cloud-four" />
      <div className="garden-haze" />
      <Meadow interactive={interactive} />
      <div className="flying-petals">
        {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${noise(i + 7) * 100}%`, animationDuration: `${9 + noise(i + 37) * 9}s`, animationDelay: `${-noise(i + 47) * 15}s`, "--petal-size": `${5 + noise(i + 57) * 8}px` } as CSSProperties} />)}
      </div>
    </div>
  );
}