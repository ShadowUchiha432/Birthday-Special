import type { BadgeKind } from "../components/Badges";
import type { WishId } from "./handTracking";

export interface Wish {
  id: WishId;
  emoji: string;
  name: string;
  instruction: string;
  badge: BadgeKind;
  message: string;
}

export const WISHES: Wish[] = [
  {
    id: "present", emoji: "👍", name: "A little gift",
    instruction: "Give me a thumbs up, with your other fingers curled in.",
    badge: "present", message: "This little box is only the opener, babe. The real gift is a lifetime of me choosing you — you are the most precious thing I have ever been given.",
  },
  {
    id: "baby", emoji: "✌️", name: "The day you arrived",
    instruction: "Make a peace sign with your index and middle fingers.",
    badge: "baby", message: "The day you were born, babe, the world quietly became better. I love you the way one loves something far too precious for this world — fiercely, gently, and always.",
  },
  {
    id: "cake", emoji: "🙌", name: "A birthday cake",
    instruction: "Raise both open hands, with your palms facing the camera.",
    badge: "cake", message: "A whole cake for my baby girl, babe, because nothing ordinary will ever do for you. You arrived on the most wonderful day, and I will celebrate you long after the candles are gone.",
  },
  {
    id: "heart", emoji: "🫶", name: "My whole heart",
    instruction: "Form a heart: touch your index fingertips together at the top and your thumbs below. Keep both wrists in view.",
    badge: "heart", message: "Cake and gifts are easy, babe. My whole heart is the true one — every imperfect, lucky beat of it has your name on it, today and always.",
  },
  {
    id: "three", emoji: "Ⅲ", name: "Three years of us",
    instruction: "Raise your index, middle, and ring fingers; tuck your little finger in.",
    badge: "three", message: "Three years of us, babe, and I would choose you a thousand times over. You are my first thought in the morning and my last at night.",
  },
];