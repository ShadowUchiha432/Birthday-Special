import type { CSSProperties } from "react";

/**
 * Splits text into words or letters and pops each one in with a soft bounce.
 * Words keep long paragraphs performant; letters are used for short, special lines.
 */
export default function AnimatedText({
  text,
  mode = "words",
  active,
  delay = 0,
  step,
  className = "",
}: {
  text: string;
  mode?: "words" | "letters";
  active: boolean;
  delay?: number;
  step?: number;
  className?: string;
}) {
  const parts = mode === "letters" ? Array.from(text) : text.split(" ");
  const gap = step ?? (mode === "letters" ? 42 : 26);

  return (
    <span className={`animated-text ${className}`} aria-label={text}>
      {parts.map((part, i) => (
        <span
          key={`${part}-${i}`}
          aria-hidden="true"
          className={`pop-unit ${active ? "pop-unit-in" : ""}`}
          style={{ animationDelay: `${delay + i * gap}ms` } as CSSProperties}
        >
          {part === " " ? "\u00A0" : part}
          {mode === "words" && i < parts.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
