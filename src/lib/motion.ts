/** Motion tokens shared by CSS (index.css --ease-fintech / --dur-*) and framer-motion. */
export const EASE = [0.22, 1, 0.36, 1] as const; // custom "fintech" ease-out
export const DUR = { fast: 0.2, base: 0.25, slow: 0.35 } as const;
export const T = { duration: DUR.base, ease: EASE };

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Recharts series props: draw in progressively (350ms, ease-out); off with reduced motion. */
export function chartAnim() {
  return { isAnimationActive: !prefersReduced(), animationDuration: 350, animationEasing: "ease-out" as const };
}
