import { ArrowRight, Camera, Heart, Sparkles } from "lucide-react";
import { WISHES } from "../lib/wishes";
import GestureIcon from "./GestureIcon";

export default function Instructions({ onStart }: { onStart: () => void }) {
  const inPreviewFrame = typeof window !== "undefined" && window.self !== window.top;
  return (
    <main className="instructions-screen">
      <div className="instruction-glow" />
      <div className="instruction-flower instruction-flower-left" aria-hidden="true">✳</div>
      <div className="instruction-flower instruction-flower-right" aria-hidden="true">✳</div>
      <section className="instruction-content">
        <div className="hello-note"><Heart size={14} fill="currentColor" /> Hello babe, it's me ^^</div>
        <p className="eyebrow">I WANT TO SPOIL YOU FOR A WHOLE DAY</p>
        <h1>Let's make some<br /><em>birthday wishes.</em></h1>
        <p className="instruction-intro">Prop your phone somewhere cosy, babe, and keep your hands free for a little while. My favourite person deserves five surprises — and your own two hands are going to make every one of them happen.</p>
        <div className="sign-guide" aria-label="The five hand signs">
          {WISHES.map((wish, i) => (
            <div key={wish.id} className="sign-guide-item" style={{ animationDelay: `${i * 90 + 500}ms` }}>
              <span className="sign-guide-emoji" aria-label={wish.emoji}><GestureIcon kind={wish.id} size={43} /></span><span>{["GIFT", "BIRTH", "CAKE", "HEART", "US"][i]}</span>
            </div>
          ))}
        </div>
        <p className="instruction-detail"><Sparkles size={15} /> Hold each sign for 5 seconds, babe — every wish I hid inside has been waiting just for you.</p>
        <button onClick={onStart} className="primary-button"><Camera size={17} /> Enable camera <ArrowRight size={17} /></button>
        <p className="camera-permission-note">Tap <b>Allow</b> when your browser asks for the camera, babe — and get comfortable first. I want you relaxed while you play.</p>
        {inPreviewFrame && <p className="camera-warning">This page is inside a preview window, which can block cameras. If the camera doesn't turn on, open this page in a new tab.</p>}
        <p className="privacy-note">Your camera stays on your device, babe. Nothing is recorded.</p>
      </section>
    </main>
  );
}