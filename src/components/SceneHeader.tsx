import { Flower2, Music2, RotateCcw, VolumeX } from "lucide-react";

export default function SceneHeader({ onReset, musicOn, onMusic }: { onReset: () => void; musicOn: boolean; onMusic: () => void }) {
  return (
    <header className="scene-header">
      <div className="brand-lockup" aria-label="A Garden of Wishes">
        <span className="brand-icon"><Flower2 size={23} strokeWidth={1.35} /></span>
        <span><strong>WISHES IN BLOOM</strong><small>made with love, for you</small></span>
      </div>
      <div className="header-actions">
        <button onClick={onReset} className="header-button" aria-label="Explore again"><RotateCcw size={15} /> <span>Explore again</span></button>
        <button
          onClick={onMusic}
          className="header-button music-button"
          aria-pressed={musicOn}
          title='Birthday — Selena Gomez (loads song.mp3)'
        >
          {musicOn ? <Music2 size={15} /> : <VolumeX size={15} />}
          <span>Song {musicOn ? "on" : "off"}</span>
        </button>
      </div>
    </header>
  );
}