/**
 * Motion tokens (mirrored in index.css). Platform-aware:
 *  - iOS (UA or installed standalone): spring physics.
 *  - Android / others: Material 3 "emphasized" easing cubic-bezier(0.2, 0, 0, 1).
 * Entry 200–250ms, exit 150–200ms, complex views max 350ms.
 */
import type { Transition } from "framer-motion";

export const M3_EMPHASIZED = [0.2, 0, 0, 1] as const;
export const DECELERATE = [0, 0, 0.2, 1] as const;
/** Default curve for duration-based tweens (path draws, etc.). */
export const EASE = M3_EMPHASIZED;
export const DUR = { exit: 0.18, fast: 0.2, base: 0.24, slow: 0.35 } as const;

export const IS_IOS: boolean = (() => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iOSDevice || (standalone && /Safari/.test(ua) && !/Chrome|Android/.test(ua));
})();

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;
const SPRING_SOFT = { type: "spring", stiffness: 300, damping: 32, mass: 1 } as const;

/** Entry transition (~200–250ms feel). */
export const ENTER: Transition = IS_IOS ? SPRING : { duration: DUR.base, ease: M3_EMPHASIZED };
/** Exit transition (150–200ms). Exits are always short tweens so they never linger. */
export const EXIT: Transition = { duration: DUR.exit, ease: IS_IOS ? [0.32, 0.72, 0, 1] : M3_EMPHASIZED };
/** Complex views (sheets, expanded cards): capped at 350ms. */
export const COMPLEX: Transition = IS_IOS ? SPRING_SOFT : { duration: DUR.slow, ease: M3_EMPHASIZED };
/** Global default for framer-motion (MotionConfig). */
export const T: Transition = ENTER;
/** Choreography step between siblings (15–30ms). */
export const STAGGER = 0.025;

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Recharts series props: draw in progressively (350ms); off with reduced motion. */
export function chartAnim() {
  return { isAnimationActive: !prefersReduced(), animationDuration: 350, animationEasing: "ease-out" as const };
}

/** Mark <html> so CSS can switch the easing token per platform. */
export function applyPlatformClass() {
  if (typeof document !== "undefined" && IS_IOS) document.documentElement.classList.add("platform-ios");
}
