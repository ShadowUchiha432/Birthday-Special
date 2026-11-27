import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export type Landmark = { x: number; y: number; z: number };
export type Fingers = { index: boolean; middle: boolean; ring: boolean; pinky: boolean };
export type TrackedHand = {
  id: string;
  landmarks: Landmark[];
  fingers: Fingers;
  pinch: boolean;
};
export type HandSample = { hands: TrackedHand[]; timestamp: number; aspect: number };
export type WishId = "present" | "baby" | "cake" | "heart" | "three";

export type HandTrackerCallbacks = {
  onSample: (sample: HandSample) => void;
  /** The camera preview is running; the hand model may still be loading. */
  onCamera: () => void;
  /** The hand-tracking model is ready and gestures can be detected. */
  onTracking: () => void;
  onFailure: (message: string) => void;
};

const distance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.7);
const imageDistance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

function fingerExtended(points: Landmark[], base: number) {
  const [a, b, c] = [points[base], points[base + 1], points[base + 3]];
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const cosine = (ab.x * bc.x + ab.y * bc.y + ab.z * bc.z) /
    (Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(bc.x, bc.y, bc.z) || 1);
  return cosine > 0.35 && distance(c, points[0]) > distance(b, points[0]) * 1.08;
}

export function getFingers(points: Landmark[]): Fingers {
  return {
    index: fingerExtended(points, 5),
    middle: fingerExtended(points, 9),
    ring: fingerExtended(points, 13),
    pinky: fingerExtended(points, 17),
  };
}

function inImageSpace(point: Landmark, aspect: number): Landmark {
  return { x: point.x * aspect, y: point.y, z: point.z * aspect };
}

function preferredDelegate(): "GPU" | "CPU" {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return "CPU";
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(renderer) ? "CPU" : "GPU";
  } catch {
    return "CPU";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

async function assetsReachable(urls: string[]) {
  try {
    const checks = await Promise.all(urls.map(async (url) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(url, { method: "HEAD", signal: controller.signal, cache: "no-store" });
        return response.ok;
      } finally {
        window.clearTimeout(timer);
      }
    }));
    return checks.every(Boolean);
  } catch {
    return false;
  }
}

function isHeart(hands: TrackedHand[], aspect: number) {
  if (hands.length !== 2) return false;
  const a = hands[0].landmarks.map((p) => inImageSpace(p, aspect));
  const b = hands[1].landmarks.map((p) => inImageSpace(p, aspect));
  const palmWidth = (imageDistance(a[5], a[17]) + imageDistance(b[5], b[17])) / 2;
  if (palmWidth < 0.01) return false;
  const indexGap = imageDistance(a[8], b[8]);
  const thumbGap = imageDistance(a[4], b[4]);
  const tipY = (a[8].y + b[8].y) / 2;
  const thumbY = (a[4].y + b[4].y) / 2;
  const wristGap = imageDistance(a[0], b[0]);
  return indexGap < palmWidth * 1.15 && thumbGap < palmWidth * 1.05 &&
    thumbY - tipY > palmWidth * 0.18 && wristGap > palmWidth * 0.55;
}

export function matchesWish(hands: TrackedHand[], wish: WishId, aspect: number): boolean {
  if (wish === "heart") return isHeart(hands, aspect);
  if (wish === "cake") {
    return hands.length === 2 && hands.every((hand) => {
      const f = hand.fingers;
      const raisedCount = Number(f.index) + Number(f.middle) + Number(f.ring) + Number(f.pinky);
      const p = hand.landmarks;
      return raisedCount >= 3 && p[0].y > p[9].y && p[12].y < p[0].y;
    });
  }
  return hands.some(({ landmarks: p, fingers: f }) => {
    if (wish === "baby") return f.index && f.middle && !f.ring && !f.pinky;
    if (wish === "three") return f.index && f.middle && f.ring && !f.pinky;
    if (wish === "present") {
      const palmHeight = Math.abs(p[0].y - p[9].y);
      const thumbUp = p[4].y < p[3].y && p[4].y < p[2].y - palmHeight * 0.15;
      return thumbUp && !f.index && !f.middle && !f.ring && !f.pinky;
    }
    return false;
  });
}

function friendlyCameraError(error: unknown): string {
  if (!window.isSecureContext) {
    return "Camera access needs a secure connection. Please open this page with https:// (or on localhost), then try again.";
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError" || error.name === "PermissionDeniedError") {
      return window.self !== window.top
        ? "Camera permission was blocked. If this page is inside a preview window, open it in a new tab, then allow camera access."
        : "Camera permission wasn't granted. Tap the camera icon in your browser's address bar, choose Allow, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") return "No camera was found on this device. Connect a camera, then try again.";
    if (error.name === "NotReadableError" || error.name === "TrackStartError") return "Your camera is busy in another app or tab. Close it, then try again.";
    if (error.name === "NotSupportedError") return "This browser doesn't support camera access. Please try Chrome, Edge, or Safari.";
    if (error.name === "OverconstrainedError") return "The camera couldn't match the requested settings. Please try again.";
  }
  return "The camera couldn't start. Check your browser's camera permission, then try again.";
}

export class HandTracker {
  private video: HTMLVideoElement;
  private callbacks: HandTrackerCallbacks;
  private providedStream: Promise<MediaStream> | null;
  private stream: MediaStream | null = null;
  private model: HandLandmarker | null = null;
  private frame = 0;
  private lastVideoTime = -1;
  private nextInferenceAt = 0;
  private disposed = false;

  constructor(video: HTMLVideoElement, callbacks: HandTrackerCallbacks, providedStream?: Promise<MediaStream> | null) {
    this.video = video;
    this.callbacks = callbacks;
    this.providedStream = providedStream ?? null;
  }

  /** Shows the camera as soon as it is available; model loading happens separately. */
  async start(): Promise<boolean> {
    try {
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.setAttribute("playsinline", "");
      this.video.setAttribute("muted", "");

      let stream: MediaStream;
      if (this.providedStream) {
        stream = await this.providedStream;
        this.providedStream = null;
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Camera API is not available", "NotSupportedError");
        }
        const videoConstraints: MediaTrackConstraints = { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } };
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
        } catch (error) {
          if (error instanceof DOMException && error.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } else {
            throw error;
          }
        }
      }

      if (this.disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      this.stream = stream;
      this.video.srcObject = stream;
      // Never treat a blocked autoplay as a camera failure. The user can tap the preview.
      this.video.play().catch(() => {});
      this.video.addEventListener("loadeddata", () => { this.video.play().catch(() => {}); }, { once: true });
      this.callbacks.onCamera();

      if (this.disposed) return false;
      try {
        this.model = await this.loadModel();
      } catch {
        if (!this.disposed) {
          this.callbacks.onFailure(
            "Your camera is on, but the hand-tracking model couldn't load. Check your internet connection and tap Try camera again."
          );
        }
        return false;
      }
      if (this.disposed) {
        try { this.model.close(); } catch { /* already closed */ }
        this.model = null;
        return false;
      }

      this.callbacks.onTracking();
      this.frame = requestAnimationFrame(this.loop);
      return true;
    } catch (error) {
      if (!this.disposed) {
        this.callbacks.onFailure(friendlyCameraError(error));
      }
      return false;
    }
  }

  private async loadModel(): Promise<HandLandmarker> {
    const dir = new URL("./", window.location.href).href;
    const local = {
      wasm: `${dir}mediapipe/wasm`,
      model: `${dir}mediapipe/hand_landmarker.task`,
    };
    const candidates: { wasm: string; model: string }[] = [];
    if (await assetsReachable([`${local.wasm}/vision_wasm_internal.wasm`, local.model])) {
      candidates.push(local);
    }
    // Public assets are not always deployed with a single-file build, so keep a
    // CDN fallback. Both URLs are pinned to the installed tasks-vision version.
    candidates.push({
      wasm: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm",
      model: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    });

    const options = {
      runningMode: "VIDEO" as const,
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    const delegates: ("GPU" | "CPU")[] = preferredDelegate() === "GPU" ? ["GPU", "CPU"] : ["CPU", "GPU"];
    let lastError: unknown = null;

    for (const assets of candidates) {
      try {
        const vision = await withTimeout(FilesetResolver.forVisionTasks(assets.wasm), 20000, "Hand tracker files");
        for (const delegate of delegates) {
          try {
            return await withTimeout(
              HandLandmarker.createFromOptions(vision, {
                ...options,
                baseOptions: { modelAssetPath: assets.model, delegate },
              }),
              30000,
              "Hand tracker model",
            );
          } catch (error) {
            lastError = error;
          }
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Hand tracker could not load");
  }

  private loop = () => {
    if (this.disposed || !this.model) return;
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime && performance.now() >= this.nextInferenceAt) {
      this.lastVideoTime = this.video.currentTime;
      try {
        const now = performance.now();
        const result = this.model.detectForVideo(this.video, now);
        const aspect = (this.video.videoWidth || 4) / (this.video.videoHeight || 3);
        const usedIds = new Set<string>();
        const hands = result.landmarks.map((landmarks, i) => {
          const world = result.worldLandmarks[i] || landmarks.map((p) => inImageSpace(p, aspect));
          const width = distance(inImageSpace(landmarks[5], aspect), inImageSpace(landmarks[17], aspect));
          const pinchDistance = distance(inImageSpace(landmarks[4], aspect), inImageSpace(landmarks[8], aspect));
          const side = result.handednesses[i]?.[0]?.categoryName || "hand";
          const id = usedIds.has(side) ? `${side}-${i}` : side;
          usedIds.add(id);
          return {
            id,
            landmarks,
            fingers: getFingers(world),
            pinch: pinchDistance < width * 0.52,
          };
        });
        this.callbacks.onSample({ hands, timestamp: performance.now(), aspect });
        this.nextInferenceAt = performance.now() + 10;
      } catch {
        this.callbacks.onFailure("Hand tracking was interrupted. Tap Try camera again to restart it.");
        this.stop();
        return;
      }
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  stop() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    try { this.model?.close(); } catch { /* model may not be ready */ }
    this.model = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  }
}
