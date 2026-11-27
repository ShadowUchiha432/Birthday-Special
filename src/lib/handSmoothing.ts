import type { Landmark, TrackedHand } from "./handTracking";

type AxisFilter = {
  xPrev: number;
  dxPrev: number;
  tPrev: number;
};

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / Math.max(dt, 1e-4));
};

function filterAxis(state: AxisFilter, value: number, dt: number, minCutoff: number, beta: number, dCutoff: number): number {
  const aDeriv = alpha(dCutoff, dt);
  const dx = (value - state.xPrev) / Math.max(dt, 1e-4);
  const dxHat = state.dxPrev + aDeriv * (dx - state.dxPrev);
  const cutoff = minCutoff + beta * Math.abs(dxHat);
  const aVal = alpha(cutoff, dt);
  const xHat = state.xPrev + aVal * (value - state.xPrev);
  state.xPrev = xHat;
  state.dxPrev = dxHat;
  return xHat;
}

type Track = {
  id: string;
  lastTimestamp: number;
  cx: number;
  cy: number;
  axes: { x: AxisFilter; y: AxisFilter; z: AxisFilter }[];
};

const MATCH_RADIUS = 0.35;
const TRACK_TIMEOUT = 600;

export class HandSmoother {
  private tracks = new Map<string, Track>();
  private nextId = 0;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(minCutoff = 1.8, beta = 5.5, dCutoff = 2.5) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  /**
   * One-Euro smoothing with position-stable tracking IDs. Incoming hands are
   * matched to existing tracks by wrist position (not by the detector's
   * left/right label, which can flip when hands touch), so each virtual hand
   * follows its real hand exactly — even during the two-hand heart sign.
   */
  smooth(hands: TrackedHand[], now: number): TrackedHand[] {
    for (const [id, track] of this.tracks) {
      if (now - track.lastTimestamp > TRACK_TIMEOUT) {
        this.tracks.delete(id);
      }
    }

    const incoming = hands.map((hand) => ({
      hand,
      cx: hand.landmarks[0]?.x ?? 0.5,
      cy: hand.landmarks[0]?.y ?? 0.5,
    }));

    // Greedy nearest-neighbour assignment: closest pairs first.
    const pairs: { i: number; id: string; d: number }[] = [];
    incoming.forEach((inc, i) => {
      for (const [id, track] of this.tracks) {
        pairs.push({ i, id, d: Math.hypot(inc.cx - track.cx, inc.cy - track.cy) });
      }
    });
    pairs.sort((a, b) => a.d - b.d);
    const assigned = new Map<number, string>();
    const used = new Set<string>();
    for (const p of pairs) {
      if (assigned.has(p.i) || used.has(p.id) || p.d > MATCH_RADIUS) continue;
      assigned.set(p.i, p.id);
      used.add(p.id);
    }

    return incoming.map((inc, i) => {
      const id = assigned.get(i);
      const track = id ? this.tracks.get(id) : undefined;
      if (!track || track.axes.length !== inc.hand.landmarks.length) {
        const freshId = `track-${this.nextId++}`;
        this.tracks.set(freshId, {
          id: freshId,
          lastTimestamp: now,
          cx: inc.cx,
          cy: inc.cy,
          axes: inc.hand.landmarks.map((p) => ({
            x: { xPrev: p.x, dxPrev: 0, tPrev: now },
            y: { xPrev: p.y, dxPrev: 0, tPrev: now },
            z: { xPrev: p.z, dxPrev: 0, tPrev: now },
          })),
        });
        return { ...inc.hand, id: freshId };
      }

      const dt = Math.min(Math.max((now - track.lastTimestamp) / 1000, 1 / 120), 0.1);
      track.lastTimestamp = now;
      track.cx = inc.cx;
      track.cy = inc.cy;

      const smoothed: Landmark[] = inc.hand.landmarks.map((p, j) => {
        const ax = track.axes[j];
        return {
          x: filterAxis(ax.x, p.x, dt, this.minCutoff, this.beta, this.dCutoff),
          y: filterAxis(ax.y, p.y, dt, this.minCutoff, this.beta, this.dCutoff),
          z: filterAxis(ax.z, p.z, dt, this.minCutoff, this.beta, this.dCutoff),
        };
      });

      return { ...inc.hand, id: track.id, landmarks: smoothed };
    });
  }

  reset() {
    this.tracks.clear();
    this.nextId = 0;
  }
}
