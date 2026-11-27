import { strict as assert } from "node:assert";
import { test } from "node:test";
import { advanceHold, type HoldState } from "../src/lib/gestureHold";
import { HandSmoother } from "../src/lib/handSmoothing";
import { getFingers, matchesWish, type Landmark, type TrackedHand } from "../src/lib/handTracking";

const point = (x: number, y: number): Landmark => ({ x, y, z: 0 });
const closed = { index: false, middle: false, ring: false, pinky: false };

function hand(fingers = closed): TrackedHand {
  const landmarks = Array.from({ length: 21 }, () => point(0.5, 0.5));
  landmarks[0] = point(0.5, 0.8);
  landmarks[2] = point(0.4, 0.5);
  landmarks[3] = point(0.4, 0.4);
  landmarks[4] = point(0.4, 0.3);
  landmarks[5] = point(0.4, 0.5);
  landmarks[9] = point(0.5, 0.5);
  landmarks[12] = point(0.5, 0.25);
  landmarks[17] = point(0.6, 0.5);
  return { id: "hand", landmarks, fingers, pinch: false };
}

test("a wish requires a continuous five-second recognized hold", () => {
  let state: HoldState = { lastValid: null, elapsed: 0 };
  for (let time = 0; time <= 4900; time += 100) state = advanceHold(state, true, time);
  assert.equal(state.elapsed, 4900);
  state = advanceHold(state, true, 5000);
  assert.equal(state.elapsed, 5000);
});

test("a wrong pose or a long tracking gap resets the hold", () => {
  let state: HoldState = { lastValid: null, elapsed: 0 };
  state = advanceHold(state, true, 100);
  state = advanceHold(state, true, 600);
  assert.equal(state.elapsed, 500);
  state = advanceHold(state, false, 950);
  assert.equal(state.elapsed, 0);
  state = advanceHold(state, true, 1000);
  state = advanceHold(state, true, 6000);
  assert.equal(state.elapsed, 0);
});

test("finger joints distinguish extended and curled fingers", () => {
  const points = Array.from({ length: 21 }, () => point(0, 0));
  points[0] = point(0, 1);
  for (const [i, base] of [5, 9, 13, 17].entries()) {
    points[base] = point(i * 0.1, 0.65);
    points[base + 1] = point(i * 0.1, 0.45);
    points[base + 2] = point(i * 0.1, 0.35);
    points[base + 3] = point(i * 0.1, i < 2 ? 0.2 : 0.65);
  }
  assert.deepEqual(getFingers(points), { index: true, middle: true, ring: false, pinky: false });
});

test("one-hand poses do not unlock the wrong wishes", () => {
  const thumb = hand();
  const peace = hand({ index: true, middle: true, ring: false, pinky: false });
  const three = hand({ index: true, middle: true, ring: true, pinky: false });
  assert.equal(matchesWish([thumb], "present", 1), true);
  assert.equal(matchesWish([thumb], "baby", 1), false);
  assert.equal(matchesWish([peace], "baby", 1), true);
  assert.equal(matchesWish([peace], "three", 1), false);
  assert.equal(matchesWish([three], "three", 1), true);
  assert.equal(matchesWish([three], "cake", 1), false);
});

test("raised hands and heart each require two appropriate hands", () => {
  const open = { index: true, middle: true, ring: true, pinky: true };
  const left = hand(open);
  const right = hand(open);
  assert.equal(matchesWish([left], "cake", 1), false);
  assert.equal(matchesWish([left, right], "cake", 1), true);

  left.landmarks[0] = point(0.3, 0.8);
  right.landmarks[0] = point(0.7, 0.8);
  left.landmarks[8] = point(0.49, 0.3);
  right.landmarks[8] = point(0.51, 0.3);
  left.landmarks[4] = point(0.49, 0.5);
  right.landmarks[4] = point(0.51, 0.5);
  assert.equal(matchesWish([left], "heart", 1), false);
  assert.equal(matchesWish([left, right], "heart", 1), true);
});

test("hand smoother dampens small jitter while following large motion", () => {
  const smoother = new HandSmoother();
  const base = hand();
  const first = smoother.smooth([base], 0);
  assert.equal(first[0].landmarks[8].x, base.landmarks[8].x);

  const jittered = hand();
  jittered.landmarks[8] = point(base.landmarks[8].x + 0.015, base.landmarks[8].y);
  const damped = smoother.smooth([jittered], 16);
  const dampedDelta = Math.abs(damped[0].landmarks[8].x - base.landmarks[8].x);
  assert.ok(dampedDelta < 0.01, `expected jitter to be damped, got ${dampedDelta}`);

  const moved = hand();
  moved.landmarks[8] = point(0.9, 0.2);
  const responsive = smoother.smooth([moved], 32);
  assert.ok(responsive[0].landmarks[8].x > 0.65);
});