import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CakeSlice, ChevronDown, Heart, Sparkles } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import AnimatedText from "./AnimatedText";
import Celebration from "./Celebration";
import { sfx } from "../lib/sfx";

const READING_TIME_MS = 60_000; // 1 full minute of uninterrupted reading time

function LoveStamp({ active }: { active: boolean }) {
  return (
    <svg
      className={`love-stamp ${active ? "love-stamp-in" : ""}`}
      viewBox="0 0 120 120"
      aria-label="A love stamp from Rex"
      role="img"
    >
      <defs>
        <path id="stamp-ring" d="M60,60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="#f9d3dc" stroke="#b56d7d" strokeWidth="2" />
      <circle cx="60" cy="60" r="51" fill="none" stroke="#b56d7d" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="#b56d7d" strokeWidth="1.2" />
      <text fill="#8e4d60" fontSize="10" fontWeight="700" letterSpacing="3">
        <textPath href="#stamp-ring">WITH LOVE · REX · FOREVER ·</textPath>
      </text>
      <path
        d="M60 73 C46 63 43 55 49 50 C54 46 58 49 60 53 C62 49 66 46 71 50 C77 55 74 63 60 73 Z"
        fill="#c8607c"
      />
      <path d="M52 52 q2 -3 5 -2" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function Flourish() {
  return (
    <svg className="paper-flourish" viewBox="0 0 180 22" aria-hidden="true">
      <path d="M8 11 H70" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M110 11 H172" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M90 17 C82 11.4 80.4 7 84 4.6 C86.8 2.8 89.2 4.6 90 6.8 C90.8 4.6 93.2 2.8 96 4.6 C99.6 7 98 11.4 90 17 Z"
        fill="currentColor"
      />
      <circle cx="76" cy="11" r="1.6" fill="currentColor" />
      <circle cx="104" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Faint hearts drifting up inside the opened letter. */
function PaperHearts({ active }: { active: boolean }) {
  const hearts = [
    { x: 8, d: 0, s: 13, t: 11 },
    { x: 22, d: 3.2, s: 9, t: 13 },
    { x: 38, d: 6.1, s: 15, t: 12 },
    { x: 57, d: 1.6, s: 10, t: 14 },
    { x: 72, d: 4.7, s: 14, t: 11.5 },
    { x: 88, d: 8.3, s: 9, t: 13.5 },
    { x: 47, d: 9.8, s: 12, t: 12.5 },
  ];
  return (
    <div className={`paper-hearts ${active ? "on" : ""}`} aria-hidden="true">
      {hearts.map((h, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          style={{ "--hx": `${h.x}%`, "--hd": `${h.d}s`, "--hs": `${h.s}px`, "--ht": `${h.t}s` } as CSSProperties}
        >
          <path d="M12 21C4.5 15.4 2 11.8 2 8.6 2 5.9 4.1 4 6.7 4c2 0 3.6 1.1 4.4 2.7h1.8C13.7 5.1 15.3 4 17.3 4 19.9 4 22 5.9 22 8.6c0 3.2-2.5 6.8-10 12.4Z" />
        </svg>
      ))}
    </div>
  );
}

const PARAGRAPHS = [
  "For as long as I can remember, I've given my love a letter — so doing it again might not be the best surprise. However, it's one of the finest ways to show how much the one I love means to me, far more than words can describe.",
  "There is no doubt that our relationship has been through its ups and downs. Yet, despite everything, we've created so many beautiful memories together — navigating misunderstandings, emotional struggles, and much more complicated situations, and yet here we both are.",
  "That's why this letter isn't only about expressing my love for you or wishing you a happy birthday. It's special because today marks the day my daughter came into this world.",
  "I'll be honest: if you hadn't been born, I might be the type of guy who roamed around without forming deep connections. But I am deeply attached to you because you are the one I love the most.",
  "From the very first day of our dating and growing closer, I began to see you as my adorable daughter. Sometimes you ask why I don't get mad at you or stop talking to you when things get difficult. I'll admit — walking away can seem easy. But the moment I remember your face, every problem vanishes. In an instant, I reach for my phone, looking for you.",
  "No matter what you think of me, you will always be my precious daughter for the rest of my life. It's my job to spoil you, tease you, cherish you, love you, and adore you. I won't let anyone else take that role from me for as long as I live.",
  "Every memory we've created and every moment we've shared means everything to me. You are my daughter, my partner, my princess, my angel, my wife, my girlfriend, my friend — my everything.",
  "Thank you for coming into this world, my love. I feel incredibly lucky to share this lifetime with such an amazing girlfriend as you. I love you so much, and this feeling will not change in the future. No matter what we do together, you will always be in my thoughts — there's no stopping me!",
  "Once again, I love you — and happy birthday, my precious girl!",
];

export default function Finale({ onNext }: { onNext: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [surpriseReady, setSurpriseReady] = useState(false);

  // Give her 1 full minute (60s) of uninterrupted reading time.
  // After 1 minute, show one single gentle notification + a permanent button below —
  // no repeating pop-up countdowns, so she can keep reading and continue whenever she likes.
  useEffect(() => {
    if (!open) return;
    let delay = READING_TIME_MS;
    if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      const override = (window as unknown as { __letterWaitMs?: number }).__letterWaitMs;
      if (typeof override === "number" && override >= 0) delay = override;
    }
    const timer = window.setTimeout(() => {
      setSurpriseReady(true);
      sfx.notify();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <main className={`finale-screen ${open ? "finale-open" : ""} ${surpriseReady ? "finale-surprise-ready" : ""}`}>
      <Celebration active={open} intensity={1} />

      <div className="finale-heading">
        <p className="eyebrow">
          <Sparkles size={13} /> WRITTEN BY REX, FOR THE GIRL I CHERISH MOST <Sparkles size={13} />
        </p>
        <h1>
          {open ? (
            <>
              Read slowly, <em>my babe.</em>
            </>
          ) : (
            <>
              A letter, <em>from your babe.</em>
            </>
          )}
        </h1>
        <p>{open ? "Every word here is yours, babe — take them slowly." : "I hid a little piece of my heart inside this envelope, just for you."}</p>
      </div>

      <div className={`letter-assembly ${open ? "letter-is-open" : ""}`}>
        <div className="envelope-back" />
        <article
          className="letter-paper"
          aria-hidden={!open}
          onScroll={(e) => {
            if (!scrolled && e.currentTarget.scrollTop > 24) setScrolled(true);
          }}
        >
          <div className="paper-content">
            <p className="paper-eyebrow">
              <AnimatedText text="FOR THE MOST PRECIOUS GIRL I KNOW" mode="letters" active={open} delay={1150} step={24} />
            </p>
            <h2>
              <AnimatedText text="My dearest babe," mode="letters" active={open} delay={1400} step={34} />
            </h2>
            <Flourish />
            {PARAGRAPHS.map((text, i) => (
              <p key={i} className={i === 0 ? "letter-dropcap" : undefined}>
                <AnimatedText text={text} mode="words" active={open} delay={2500 + i * 880} step={18} />
              </p>
            ))}
            <div className="paper-signature">
              <div className="signature-lines">
                <span className="signature-forever">
                  <AnimatedText text="Forever yours, with all my heart," mode="words" active={open} delay={11500} step={72} />
                </span>
                <span className="signature-name">
                  <AnimatedText text="Rex" mode="letters" active={open} delay={12050} step={170} />
                </span>
                <svg className="signature-heart" viewBox="0 0 130 20" aria-hidden="true">
                  <path
                    d="M4 10 C30 4 52 4 62 9 C58 4 62 1.5 65 4.5 C66.5 6 66 8 65 9.5 C70 5 74 6.5 73.5 9.5 C73 12.5 68 14 65 15.5 C62 14 58.5 12 58.5 9.5 M68 9 C82 4 104 5 126 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <LoveStamp active={open} />
            </div>
          </div>
        </article>
        <PaperHearts active={open} />
        {open && !scrolled && !surpriseReady && (
          <div className="letter-scroll-hint" aria-hidden="true">
            SCROLL, BABE <ChevronDown size={13} />
          </div>
        )}
        <div className="envelope-front" />
        <div className="envelope-flap" />
        {!open && (
          <button className="envelope-seal" onClick={() => setOpen(true)} aria-label="Open your love letter">
            <Heart size={23} fill="currentColor" />
          </button>
        )}
      </div>

      {!open && <p className="open-letter-hint">TAP THE HEART TO OPEN YOUR LETTER</p>}

      <AnimatePresence>
        {surpriseReady && (
          <motion.div
            className="letter-surprise-dock"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, x: "-50%", y: 24, scale: 0.94 }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            <p className="letter-surprise-note">
              <Sparkles size={14} /> I got one more surprise for you, my babe <Heart size={13} fill="currentColor" />
            </p>
            <button className="primary-button letter-surprise-btn" onClick={onNext}>
              <CakeSlice size={16} /> Open my last surprise <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
