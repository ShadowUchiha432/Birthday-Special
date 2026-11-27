import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Intro from "./components/Intro";
import Garden from "./components/Garden";
import Instructions from "./components/Instructions";
import CameraScene from "./components/CameraScene";
import Combine from "./components/Combine";
import Finale from "./components/Finale";
import CakeScene from "./components/CakeScene";
import SceneHeader from "./components/SceneHeader";
import { birthdayPlayer } from "./lib/audio";
import { sfx, soundFor } from "./lib/sfx";
import type { BadgeKind } from "./components/Badges";

type Stage = "intro" | "garden" | "instructions" | "camera" | "combine" | "finale" | "cake";

export default function App() {
  const [stage, setStage] = useState<Stage>("intro");
  const [musicOn, setMusicOn] = useState(false);
  const [songNotice, setSongNotice] = useState(false);
  const [combineKinds, setCombineKinds] = useState<BadgeKind[]>([]);
  const [cameraStream, setCameraStream] = useState<Promise<MediaStream> | null>(null);
  // Every button gets a tiny warm sound so the whole page feels interactive.
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.("button")) {
        const kind = soundFor(target);
        if (!kind) return;
        if (kind === "chime") sfx.chime();
        else if (kind === "badgeTap") sfx.badgeTap();
        else if (kind === "toggle") sfx.toggle();
        else sfx.click();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  function reset() {
    birthdayPlayer.stop();
    setMusicOn(false);
    setSongNotice(false);
    setCombineKinds([]);
    setCameraStream(null);
    setStage("intro");
  }

  async function toggleMusic() {
    const next = !musicOn;
    if (!next) {
      await birthdayPlayer.toggle(false);
      setMusicOn(false);
      setSongNotice(false);
      return;
    }
    const ok = await birthdayPlayer.toggle(true);
    setMusicOn(ok);
    if (!ok) {
      setSongNotice(true);
      window.setTimeout(() => setSongNotice(false), 5000);
    } else {
      setSongNotice(false);
    }
  }

  /**
   * Ask for the camera from inside the "Enable camera" click. Some mobile
   * browsers only allow camera permission to be requested from a direct tap.
   * CameraScene receives the pending stream rather than asking again on mount.
   */
  function beginCamera() {
    let request: Promise<MediaStream>;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        request = Promise.reject(new DOMException("Camera API is not available", "NotSupportedError"));
      } else {
        request = navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        });
      }
    } catch (error) {
      request = Promise.reject(error);
    }
    request.catch(() => {});
    setCameraStream(request);
    setStage("camera");
  }

  return (
    <div className={`app-shell stage-${stage}`}>
      {stage !== "intro" && <SceneHeader onReset={reset} musicOn={musicOn} onMusic={toggleMusic} />}
      <AnimatePresence>
        {songNotice && (
          <motion.div
            className="song-slot-toast"
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Empty song slot — add your <b>song.mp3</b> to <code>public/song.mp3</code> (or beside <code>index.html</code>) to play Birthday.
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div key={stage} className="scene-frame"
          initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          {stage === "intro" && <Intro onEnter={() => setStage("garden")} />}
          {stage === "garden" && <Garden onNext={() => setStage("instructions")} />}
          {stage === "instructions" && <Instructions onStart={beginCamera} />}
          {stage === "camera" && <CameraScene cameraStream={cameraStream} onCombine={(kinds) => { setCombineKinds(kinds); setStage("combine"); }} />}
          {stage === "combine" && <Combine kinds={combineKinds} onFinale={() => setStage("finale")} />}
          {stage === "finale" && <Finale onNext={() => setStage("cake")} />}
          {stage === "cake" && <CakeScene />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}