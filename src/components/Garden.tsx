import { ArrowRight, Moon, Sparkles, Sun, Sunset } from "lucide-react";
import { useState } from "react";
import GardenArt, { type SkyTime } from "./GardenArt";

const times: { id: SkyTime; label: string; Icon: typeof Sun }[] = [
  { id: "morning", label: "Morning", Icon: Sun },
  { id: "evening", label: "Evening", Icon: Sunset },
  { id: "night", label: "Night", Icon: Moon },
];

export default function Garden({ onNext }: { onNext: () => void }) {
  const [time, setTime] = useState<SkyTime>("morning");

  return (
    <main className={`garden-screen garden-${time}`}>
      <GardenArt time={time} interactive />
      <div className="garden-copy">
        <p className="eyebrow"><Sparkles size={13} /> GROWN ONE FLOWER AT A TIME, FOR MY BABE <Sparkles size={13} /></p>
        <h1>Welcome to your<br /><em>garden of wishes.</em></h1>
        <p>Every bloom is a quiet reminder: you are the most precious girl in my life, babe.</p>
      </div>
      <div className="garden-controls">
        <div className="sky-picker" aria-label="Choose a time of day">
          <span>PAINT THE SKY</span>
          <div className="sky-picker-buttons">
            {times.map(({ id, label, Icon }) => (
              <button key={id} className={time === id ? "selected" : ""} aria-pressed={time === id} onClick={() => setTime(id)}>
                <Icon size={15} strokeWidth={1.6} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="garden-next">
          <button onClick={onNext} className="primary-button">A surprise awaits <ArrowRight size={17} /></button>
          <span>TAKE YOUR TIME, MY LOVE</span>
        </div>
        <div className="garden-hint"><span className="hint-sparkle">✳</span><span>Brush the flowers<br /><small>and watch them sway</small></span></div>
      </div>
    </main>
  );
}