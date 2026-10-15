// Exo module: a standalone app that also runs inside ExoSky at /exo.
// It shares ExoSky's Supabase auth and data. Everything Exo-specific lives here,
// in src/components/exo and in src/lib/exoChat.ts, so it can ship as its own app later.
export { default as ExoApp } from "./ExoApp";
