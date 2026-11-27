import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { BadgeByKind, StarOfWishes, type BadgeKind } from "./Badges";

const positions = [
  { x: "25%", y: "28%" }, { x: "73%", y: "26%" }, { x: "20%", y: "64%" },
  { x: "78%", y: "65%" }, { x: "50%", y: "77%" },
];

export default function Combine({ kinds, onFinale }: { kinds: BadgeKind[]; onFinale: () => void }) {
  const [merged, setMerged] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  useEffect(() => {
    const merge = window.setTimeout(() => setMerged(true), 3200);
    const next = window.setTimeout(() => setShowFinal(true), 18200);
    return () => { window.clearTimeout(merge); window.clearTimeout(next); };
  }, []);

  return (
    <main className={`combine-screen ${merged ? "has-merged" : ""}`}>
      <div className="combine-stars" aria-hidden="true">{Array.from({ length: 50 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 7) % 100}%`, top: `${(i * 59 + 13) % 100}%`, animationDelay: `${-(i % 7) * 0.4}s` }} />)}</div>
      <div className="combine-heading"><p className="eyebrow">FIVE LITTLE WISHES, ONE ENORMOUS LOVE</p><h1>{merged ? <>Close your eyes, <em>my babe.</em></> : <>A little magic is <em>happening, babe.</em></>}</h1></div>
      <div className="merge-orbit">
        {kinds.map((kind, i) => <div key={kind} className="merging-badge" style={{ left: merged ? "50%" : positions[i].x, top: merged ? "46%" : positions[i].y, opacity: merged ? 0 : 1, transform: `translate(-50%, -50%) scale(${merged ? 0.15 : 1})`, transitionDelay: `${i * 80}ms` }}><div className="merge-float" style={{ animationDelay: `${i * -0.7}s` }}><BadgeByKind kind={kind} size={82} /></div></div>)}
        <div className="wish-star"><div className="star-halo" /><StarOfWishes size={200} /></div>
      </div>
      <div className="combine-message"><Sparkles size={16} /><p>Babe, close your eyes and wish for the whole world —<br />you deserve every bit of it.</p><Sparkles size={16} /></div>
      {showFinal && <div className="final-prompt"><p>It's not over yet, babe… one more little thing is waiting for you.</p><button className="primary-button" onClick={onFinale}>One more surprise <ArrowRight size={16} /></button></div>}
    </main>
  );
}