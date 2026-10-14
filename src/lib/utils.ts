import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the design-system tokens so e.g. `text-caption` is merged as a font
// size (not mistaken for a text colour that would drop the variant's colour).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "heading", "title", "figure", "display-xl", "display-lg", "display-md"] }],
      rounded: [{ rounded: ["card", "sheet"] }],
      shadow: [{ shadow: ["card", "card-hover", "sheet", "glow", "accent", "accent-strong"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
