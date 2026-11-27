import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import GardenArt from "./GardenArt";

export default function Intro({ onEnter }: { onEnter: () => void }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className={`intro-screen ${ready ? "intro-ready" : ""}`}>
      {ready && <GardenArt time="morning" />}
      {ready && (
        <div className="intro-content">
          <div className="intro-mark"><Sparkles size={18} strokeWidth={1.4} /></div>
          <p className="eyebrow intro-eyebrow">BABE, THIS WHOLE GARDEN IS JUST FOR YOU</p>
          <h1>A garden of <em>wishes.</em></h1>
          <p className="intro-subtitle">I grew every petal here with you in mind, because you are the most precious girl in my world.</p>
          <button className="primary-button intro-button" onClick={onEnter}>
            Explore your presents <ArrowRight size={17} />
          </button>
          <p className="intro-footnote">A BIRTHDAY SURPRISE FOR THE GIRL I CHERISH MOST — MY BABE</p>
        </div>
      )}
    </main>
  );
}