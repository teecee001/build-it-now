/** Short haptic tick (10–15ms) where the Vibration API exists (Android/Chrome); no-op elsewhere. */
export function haptic(kind: "tap" | "confirm" | "success" = "tap") {
  try {
    const ms = kind === "success" ? 15 : kind === "confirm" ? 12 : 10;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms);
  } catch {
    /* unsupported */
  }
}
