import type { WishId } from "../lib/handTracking";

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y - 3.4 * s} L${x + 0.9 * s} ${y - 0.9 * s} L${x + 3.4 * s} ${y} L${x + 0.9 * s} ${y + 0.9 * s} L${x} ${y + 3.4 * s} L${x - 0.9 * s} ${y + 0.9 * s} L${x - 3.4 * s} ${y} L${x - 0.9 * s} ${y - 0.9 * s} Z`}
      fill="currentColor"
      stroke="none"
    />
  );
}

/**
 * Clean thin-line hand-sign illustrations in a single matching style.
 * GIFT = thumbs up, BIRTH = peace, CAKE = two raised hands,
 * HEART = two hands forming a heart, US = three fingers.
 */
export default function GestureIcon({ kind, size = 42 }: { kind: WishId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "present" && (
        <>
          {/* thumb */}
          <path d="M20 23 V10.5 c0-2.8 4-2.9 4.2-.4 L25.5 21" />
          {/* curled fingers */}
          <path d="M20 23 h5.5 c5 0 8.5 2.4 8.5 7.4 V37 c0 3.8-2.8 6.4-6.6 6.4 h-7.8 c-3.2 0-5.1-1.8-5.1-4.9 V27.5" />
          <path d="M25.5 26.5 v3 M25.5 33.5 v3" opacity="0.55" />
          {/* wrist cuff */}
          <path d="M14.5 36.5 V43.5 M27.5 43.5 V36.9" />
          <path d="M14.5 43.5 H27.5" />
        </>
      )}

      {kind === "baby" && (
        <>
          {/* index + middle in a V */}
          <path d="M18.5 25 L14.5 10" />
          <path d="M24.5 25 L27 8.5" />
          {/* palm edges */}
          <path d="M14.5 27.5 c-2.4 4.4-2 9.2 1.2 12.4 L18.5 42.5" />
          <path d="M28.5 27 c3.4-.8 6 1.2 6 4.6 V34 c0 4.6-3.4 7.2-8 8.5" />
          <path d="M18.5 42.5 H27" />
          {/* thumb holding folded fingers */}
          <path d="M15.5 34.5 c-2.6-.8-3.2-3.8-1.2-5.2" />
        </>
      )}

      {kind === "cake" && (
        <>
          {/* left raised hand */}
          <path d="M7 31 V20 M10.5 31 V18 M14 31 V18.5 M17.5 31 V21" />
          <path d="M5.5 31 v4.5 c0 3.4 2.7 5.5 6.2 5.5 s6.3-2.1 6.3-5.5 V31" />
          <path d="M5.5 34.5 L3 32.5" />
          {/* right raised hand */}
          <path d="M30.5 31 V21 M34 31 V18.5 M37.5 31 V18 M41 31 V20" />
          <path d="M29 31 v4.5 c0 3.4 2.7 5.5 6.2 5.5 s6.3-2.1 6.3-5.5 V31" />
          <path d="M42.5 34.5 L45 32.5" />
          <Sparkle x={24} y={7.5} s={0.9} />
          <Sparkle x={17.5} y={12} s={0.6} />
          <Sparkle x={30.5} y={12} s={0.6} />
        </>
      )}

      {kind === "heart" && (
        <>
          {/* two cupped hands meeting to form a heart */}
          <path d="M24 11.5 C19.5 8 13.8 9.8 12.6 14.6 C11.2 20.4 15.4 27.2 24 35.8" />
          <path d="M24 11.5 C28.5 8 34.2 9.8 35.4 14.6 C36.8 20.4 32.6 27.2 24 35.8" />
          {/* finger separations */}
          <path d="M20.3 14.6 C17.8 18.6 18.8 23.6 22.4 27.2" />
          <path d="M16.4 16.6 C14.4 20.6 15.8 25.4 19.8 28.6" />
          <path d="M27.7 14.6 C30.2 18.6 29.2 23.6 25.6 27.2" />
          <path d="M31.6 16.6 C33.6 20.6 32.2 25.4 28.2 28.6" />
          {/* thumbs joining at the base */}
          <path d="M21.5 37.5 L20.5 42 M26.5 37.5 L27.5 42" opacity="0.7" />
          <Sparkle x={24} y={24.5} s={0.55} />
        </>
      )}

      {kind === "three" && (
        <>
          {/* index · middle · ring */}
          <path d="M16.5 27 V10.5" />
          <path d="M22.5 27 V8.5" />
          <path d="M28.5 27 V10.5" />
          {/* palm edges */}
          <path d="M14.5 29 c-2.2 4-1.8 8.4 1.4 11.4 L18.5 42.5" />
          <path d="M30.5 28 c3.4-.8 5.9 1.2 5.9 4.4 V35 c0 4.2-3.2 6.8-7.6 8.2" />
          <path d="M18.5 42.5 H27.5" />
          {/* tucked pinky + thumb */}
          <path d="M31.5 35.5 c2.6.6 3.6 2.8 2.6 5" opacity="0.7" />
        </>
      )}
    </svg>
  );
}
