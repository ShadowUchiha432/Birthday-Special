export type HoldState = { lastValid: number | null; elapsed: number };

export function advanceHold(state: HoldState, matching: boolean, now: number): HoldState {
  if (matching) {
    const gap = state.lastValid === null ? Infinity : now - state.lastValid;
    return { lastValid: now, elapsed: gap <= 700 ? state.elapsed + Math.max(0, gap) : 0 };
  }
  if (state.lastValid === null || now - state.lastValid > 300) return { lastValid: null, elapsed: 0 };
  return state;
}