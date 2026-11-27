// Cute, wholesome synthesized sound effects — warm celesta, kalimba & fairy bells.
// Zero external audio files required, so everything works out of the box.

type SfxName = "click" | "toggle" | "chime" | "badgeTap" | "success" | "gong" | "notify";

// Sounds are always on so every tap feels alive and interactive.
let enabled = true;
let ctx: AudioContext | null = null;
let filterNode: BiquadFilterNode | null = null;
let lastPlayedAt = 0;
let clickPitchIndex = 0;

// Soft C-major pentatonic pitches for playful, cute button taps
const CLICK_NOTES = [587.33, 659.25, 783.99, 880.0]; // D5, E5, G5, A5
// Ascending music-box notes for the 5-second hand-sign charge (lock + 1s..4s)
const CHARGE_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5..C6

function getAudio(): { ac: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Warm low-pass filter gives every bell a soft, cozy music-box tone.
    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = 3400;
    filterNode.Q.value = 0.7;
    filterNode.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return { ac: ctx, out: filterNode ?? ctx.destination };
}

/** Plays a gentle music-box bell note with a soft harmonic overtone. */
function bell(
  ac: AudioContext,
  dest: AudioNode,
  when: number,
  freq: number,
  duration: number,
  peak: number,
  shimmer = true,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0008, when + duration);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + duration + 0.04);

  if (shimmer) {
    const over = ac.createOscillator();
    const overGain = ac.createGain();
    over.type = "triangle";
    over.frequency.setValueAtTime(freq * 2, when);
    overGain.gain.setValueAtTime(0.0001, when);
    overGain.gain.exponentialRampToValueAtTime(peak * 0.28, when + 0.008);
    overGain.gain.exponentialRampToValueAtTime(0.0005, when + duration * 0.55);
    over.connect(overGain);
    overGain.connect(dest);
    over.start(when);
    over.stop(when + duration * 0.6 + 0.04);
  }
}

function play(kind: SfxName) {
  const audio = getAudio();
  if (!audio || !enabled) return;
  const { ac, out } = audio;
  const now = ac.currentTime;
  if (lastPlayedAt > 0 && now - lastPlayedAt < 0.04) return;
  lastPlayedAt = now;

  if (kind === "click") {
    // Cute kalimba / pastel droplet plink that gently walks a pentatonic scale
    const base = CLICK_NOTES[clickPitchIndex % CLICK_NOTES.length];
    clickPitchIndex = (clickPitchIndex + 1) % CLICK_NOTES.length;
    bell(ac, out, now, base, 0.19, 0.08, true);
    bell(ac, out, now + 0.025, base * 1.5, 0.14, 0.032, false);
    return;
  }

  if (kind === "toggle") {
    // Playful two-note fairy flip
    bell(ac, out, now, 783.99, 0.16, 0.068, true); // G5
    bell(ac, out, now + 0.055, 1046.5, 0.22, 0.06, true); // C6
    return;
  }

  if (kind === "badgeTap") {
    // Sparkling crystal twinkle when tapping or grabbing a wish
    bell(ac, out, now, 880.0, 0.22, 0.065, true); // A5
    bell(ac, out, now + 0.045, 1318.5, 0.28, 0.055, true); // E6
    return;
  }

  if (kind === "chime") {
    // Warm, wholesome celesta heart chord (C5 - E5 - G5 - C6)
    bell(ac, out, now, 523.25, 0.48, 0.07, true);
    bell(ac, out, now + 0.05, 659.25, 0.46, 0.06, true);
    bell(ac, out, now + 0.1, 783.99, 0.44, 0.055, true);
    bell(ac, out, now + 0.16, 1046.5, 0.55, 0.05, true);
    return;
  }

  if (kind === "notify") {
    // Gentle dreamy music-box cue when the 1-minute surprise appears
    bell(ac, out, now, 659.25, 0.5, 0.07, true); // E5
    bell(ac, out, now + 0.12, 783.99, 0.55, 0.065, true); // G5
    bell(ac, out, now + 0.24, 1046.5, 0.75, 0.075, true); // C6
    bell(ac, out, now + 0.36, 1318.5, 0.65, 0.045, false); // E6
    return;
  }

  if (kind === "success") {
    // Magical wish-bloom fairy arpeggio
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
    notes.forEach((f, i) => bell(ac, out, now + i * 0.068, f, 0.52, 0.068 - i * 0.004, true));
    return;
  }

  // gong — lush celebratory harp & music-box chord when all candles blow out
  const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1567.98];
  chord.forEach((f, i) => bell(ac, out, now + i * 0.075, f, 1.35, 0.065, true));
}

export const sfx = {
  click() {
    play("click");
  },
  toggle() {
    play("toggle");
  },
  chime() {
    play("chime");
  },
  badgeTap() {
    play("badgeTap");
  },
  notify() {
    play("notify");
  },
  success() {
    play("success");
  },
  gong() {
    play("gong");
  },
  /** Cute rising fairy-bell note while charging a hand sign (0 = lock-on, 1..4 = seconds). */
  chargeTick(step: number) {
    const audio = getAudio();
    if (!audio || !enabled) return;
    const { ac, out } = audio;
    const now = ac.currentTime;
    const idx = Math.max(0, Math.min(CHARGE_NOTES.length - 1, step));
    const freq = CHARGE_NOTES[idx];
    bell(ac, out, now, freq, 0.32, 0.068, true);
    bell(ac, out, now + 0.045, freq * 1.25, 0.24, 0.032, false);
  },
  isEnabled() {
    return enabled;
  },
  setEnabled(next: boolean) {
    enabled = next;
  },
};

/** Maps any clicked control to its sound so every button feels cute and interactive. */
export function soundFor(element: Element | null): SfxName | null {
  const btn = element?.closest?.("button") ?? null;
  if (!btn) return "click";
  if (btn.getAttribute("data-own-sfx") === "true") return null;
  const cls = btn.classList;
  const text = (btn.textContent ?? "").toLowerCase();
  if (cls.contains("floating-wish") || cls.contains("wish-dot")) {
    return "badgeTap";
  }
  if (
    cls.contains("envelope-seal") ||
    cls.contains("wish-close") ||
    cls.contains("dialog-close") ||
    cls.contains("keepsake-close") ||
    cls.contains("choice-read") ||
    cls.contains("choice-star") ||
    cls.contains("letter-surprise-btn") ||
    text.includes("surprise") ||
    text.includes("blow") ||
    text.includes("bring my cake") ||
    text.includes("memories") ||
    text.includes("explore")
  ) {
    return "chime";
  }
  if (
    cls.contains("mode-bar") ||
    cls.contains("sky-picker-buttons") ||
    cls.contains("music-button") ||
    text.includes("pen") ||
    text.includes("grab") ||
    text.includes("tap") ||
    text.includes("morning") ||
    text.includes("evening") ||
    text.includes("night")
  ) {
    return "toggle";
  }
  return "click";
}
