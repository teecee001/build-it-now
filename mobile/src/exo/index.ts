// Exo module: a standalone app that also runs inside ExoSky (route /exo, its own stack).
// It shares ExoSky's Supabase auth and data. Keep Exo code in this folder so it can ship as its own app later.
export { default as ExoScreen } from './ExoScreen';
