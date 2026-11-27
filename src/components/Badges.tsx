export type BadgeKind = "present" | "baby" | "cake" | "heart" | "three";

/* ----------------------------- PRESENT ----------------------------- */
export function PresentBadge({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="pb-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 200, 226, 0.55)" />
          <stop offset="1" stopColor="rgba(255, 200, 226, 0)" />
        </radialGradient>
        <linearGradient id="pb-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe0ef" />
          <stop offset="0.55" stopColor="#ff9bc7" />
          <stop offset="1" stopColor="#eb6b9e" />
        </linearGradient>
        <linearGradient id="pb-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0f7" />
          <stop offset="1" stopColor="#ffadd2" />
        </linearGradient>
        <linearGradient id="pb-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset="1" stopColor="#ffd788" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="54" r="46" fill="url(#pb-halo)" />
      <rect x="25" y="40" width="50" height="44" rx="9" fill="url(#pb-box)" stroke="#fff0f6" strokeWidth="1.5" />
      <rect x="25" y="40" width="50" height="7" fill="rgba(195, 70, 120, 0.22)" />
      <rect x="45" y="40" width="10" height="44" fill="url(#pb-ribbon)" />
      <rect x="21" y="30" width="58" height="14" rx="6" fill="url(#pb-lid)" stroke="#fff3f8" strokeWidth="1.4" />
      <rect x="45" y="30" width="10" height="14" fill="url(#pb-ribbon)" />
      <path d="M50 32 C37 16 23 23 32 33 C39 39 50 32 50 32 Z" fill="#ffd98c" stroke="#fff6d6" strokeWidth="1" />
      <path d="M50 32 C63 16 77 23 68 33 C61 39 50 32 50 32 Z" fill="#ffd98c" stroke="#fff6d6" strokeWidth="1" />
      <circle cx="50" cy="31" r="4.5" fill="#fff8de" stroke="#f2ba5a" strokeWidth="1" />
      <circle cx="35" cy="57" r="2.2" fill="#fff" className="badge-twinkle" />
      <circle cx="66" cy="70" r="2.5" fill="#fff8dc" className="badge-twinkle-delay" />
      <path d="M74 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" fill="#fff6d6" className="badge-twinkle" />
    </svg>
  );
}

/* ------------------------------ BABY ------------------------------- */
export function BabyBadge({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="bb-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 224, 214, 0.55)" />
          <stop offset="1" stopColor="rgba(255, 224, 214, 0)" />
        </radialGradient>
        <radialGradient id="bb-face" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fffaf5" />
          <stop offset="0.7" stopColor="#ffe5d6" />
          <stop offset="1" stopColor="#f5c0ad" />
        </radialGradient>
        <linearGradient id="bb-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#eab76a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill="url(#bb-halo)" />
      {/* golden pearl locket ring */}
      <circle cx="50" cy="53" r="37" fill="none" stroke="url(#bb-frame)" strokeWidth="3.5" />
      <circle cx="50" cy="53" r="33.5" fill="url(#bb-face)" />
      {/* rosy hair curl */}
      <path d="M49 20 q8 -9 1 -13 q-8 4 0 13" fill="none" stroke="#d19d7a" strokeWidth="3.2" strokeLinecap="round" />
      {/* happy closed eyes */}
      <path d="M36 51 q4.5 5 9 0" fill="none" stroke="#7d4f3d" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M55 51 q4.5 5 9 0" fill="none" stroke="#7d4f3d" strokeWidth="2.4" strokeLinecap="round" />
      {/* rosy blush */}
      <ellipse cx="35" cy="60" rx="5.5" ry="3.5" fill="#ff9fb4" opacity="0.65" />
      <ellipse cx="65" cy="60" rx="5.5" ry="3.5" fill="#ff9fb4" opacity="0.65" />
      {/* sweet smile */}
      <path d="M43 63 q7 7.5 14 0" fill="none" stroke="#d57386" strokeWidth="2.4" strokeLinecap="round" />
      {/* little floating heart */}
      <path d="M77 25 c-2 -3.5 -7 0 -3.5 3.5 c3.5 3.5 3.5 3.5 3.5 3.5 c0 0 0 0 3.5 -3.5 c3.5 -3.5 -1.5 -7 -3.5 -3.5 Z" fill="#ff7fa8" className="badge-twinkle" />
      <circle cx="24" cy="30" r="2" fill="#fff6e0" className="badge-twinkle-delay" />
    </svg>
  );
}

/* ------------------------------ CAKE ------------------------------ */
export function CakeBadge({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="cb-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 224, 178, 0.52)" />
          <stop offset="1" stopColor="rgba(255, 224, 178, 0)" />
        </radialGradient>
        <linearGradient id="cb-sponge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="1" stopColor="#f5c678" />
        </linearGradient>
        <linearGradient id="cb-icing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4f9" />
          <stop offset="1" stopColor="#ffbad5" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="54" r="46" fill="url(#cb-halo)" />
      {/* golden cake plate */}
      <ellipse cx="50" cy="84" rx="34" ry="5.5" fill="#f2c97d" stroke="#fff2cf" strokeWidth="1" />
      {/* bottom tier */}
      <path d="M24 54 h52 v26 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 Z" fill="url(#cb-sponge)" stroke="#fff4dc" strokeWidth="1.2" />
      <rect x="24" y="69" width="52" height="5" fill="#ff9cc0" opacity="0.55" />
      {/* strawberry icing */}
      <path d="M24 54 q6.5 -9 13 0 q6.5 -9 13 0 q6.5 -9 13 0 q6.5 -9 13 0 v9 q-6.5 6 -13 0 q-6.5 6 -13 0 q-6.5 6 -13 0 q-6.5 6 -13 0 Z" fill="url(#cb-icing)" stroke="#fff8fb" strokeWidth="1.2" />
      {/* candles */}
      {[36, 50, 64].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y={i === 1 ? 26 : 30} width="4" height={i === 1 ? 21 : 17} rx="2" fill={i === 1 ? "#ffd584" : "#ff85b3"} />
          <ellipse cx={x} cy={i === 1 ? 21 : 25} rx="3.2" ry="5.2" fill="#ffe169" className={i === 1 ? "badge-flame-alt" : "badge-flame"} />
          <ellipse cx={x} cy={i === 1 ? 22 : 26} rx="1.6" ry="2.8" fill="#fffdf0" />
        </g>
      ))}
      <circle cx="50" cy="48" r="4.2" fill="#ff5277" />
      <circle cx="48.8" cy="46.8" r="1.3" fill="#fff" opacity="0.85" />
    </svg>
  );
}

/* ------------------------------ HEART ----------------------------- */
export function HeartBadge({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="hb-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 145, 190, 0.58)" />
          <stop offset="1" stopColor="rgba(255, 145, 190, 0)" />
        </radialGradient>
        <radialGradient id="hb-gem" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffc2dc" />
          <stop offset="0.45" stopColor="#ff659f" />
          <stop offset="1" stopColor="#cf2b69" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill="url(#hb-halo)" />
      <g className="badge-pulse">
        <path
          d="M50 84 C16 59 10 37 25 26 C36 18 47 24 50 35 C53 24 64 18 75 26 C90 37 84 59 50 84 Z"
          fill="url(#hb-gem)"
          stroke="#ffd9e8"
          strokeWidth="2"
        />
        {/* faceted crystal sheen */}
        <path d="M50 36 L34 29 L24 41 L50 78 Z" fill="rgba(255, 255, 255, 0.14)" />
        <path d="M32 37 C30 30 40 27 43 34" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      </g>
      <path d="M77 25 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" fill="#fff7dc" className="badge-twinkle" />
      <circle cx="24" cy="64" r="2.2" fill="#ffeaf3" className="badge-twinkle-delay" />
    </svg>
  );
}

/* ------------------------------ THREE ----------------------------- */
export function ThreeBadge({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="tb-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 224, 150, 0.56)" />
          <stop offset="1" stopColor="rgba(255, 224, 150, 0)" />
        </radialGradient>
        <linearGradient id="tb-medallion" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.5" stopColor="#f6c76e" />
          <stop offset="1" stopColor="#d98b38" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#tb-halo)" />
      <circle cx="50" cy="50" r="36" fill="url(#tb-medallion)" stroke="#fff7dc" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="29" fill="none" stroke="#fff6db" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="50" y="62" textAnchor="middle" fontSize="37" fontWeight="600" fill="#fffdf6" fontFamily="Cormorant Garamond, Georgia, serif">
        III
      </text>
      <path d="M50 18 c-2 -3.5 -6.5 0 -3.2 3.2 c3.2 3.2 3.2 3.2 3.2 3.2 c0 0 0 0 3.2 -3.2 c3.2 -3.2 -1.2 -6.7 -3.2 -3.2 Z" fill="#ff73a8" />
      <circle cx="26" cy="34" r="2.2" fill="#fff9e3" className="badge-twinkle" />
      <circle cx="74" cy="34" r="2.2" fill="#fff9e3" className="badge-twinkle-delay" />
    </svg>
  );
}

export function BadgeByKind({ kind, size }: { kind: BadgeKind; size?: number }) {
  switch (kind) {
    case "present":
      return <PresentBadge size={size} />;
    case "baby":
      return <BabyBadge size={size} />;
    case "cake":
      return <CakeBadge size={size} />;
    case "heart":
      return <HeartBadge size={size} />;
    case "three":
      return <ThreeBadge size={size} />;
  }
}

/* -------------------------- STAR OF WISHES ------------------------- */
export function StarOfWishes({ size = 160 }: { size?: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 46 : 19;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-[0_0_24px_rgba(255,217,142,0.9)]">
      <defs>
        <radialGradient id="star" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff7df" />
          <stop offset="0.6" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ffb24d" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill="url(#star)" stroke="#fff3c4" strokeWidth="1.5" />
      <path
        d="M50 64 C36 52 33 42 40 37 C45 33 49 38 50 42 C51 38 55 33 60 37 C67 42 64 52 50 64 Z"
        fill="#ff5fa0"
      />
      <circle cx="50" cy="50" r="3" fill="#fff" opacity="0.9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={50 + 42 * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2)} cy={50 + 42 * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2)} r="2.4" fill="#fff" />
      ))}
    </svg>
  );
}
