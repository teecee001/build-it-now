# ExoSky front-page redesign — what it will look like

Goal: lift ExoSky's public pages to the polish level of the best money apps, while staying unmistakably ExoSky (dark, emerald, borderless). No copying of anyone else's branding or wording.

## The look

- **Colour**: near-black canvas, one emerald accent used sparingly (never more than one emerald element competing per screen area), soft emerald glow only behind the app preview.
- **Type**: one confident display face for headlines with tight letter spacing, a clean neutral face for everything else. Fewer sizes, bigger jumps between them.
- **Surfaces**: quiet cards with hairline borders instead of boxes floating on nothing. Consistent corner radius everywhere.
- **Motion**: gentle rise-and-fade as sections enter, a small lift on buttons, a slow breathing glow behind the phone. Fully off for anyone who prefers reduced motion.

## Page by page

**Top of the home page**
- Slim top bar: logo + Beta, then Log in and Get Started.
- One-line incentive pill ("Get $25 when you sign up").
- Headline and supporting line at a tighter, more deliberate size so the whole first screen fits without scrolling.
- Two buttons: solid emerald primary, quiet outline secondary.
- Trust line (encryption, 150+ countries, no hidden fees) as small, low-key text.
- App preview sits on the right, optically aligned to the headline, with the Mobile/Desktop switch and screen label directly beneath it.

**Proof bar**
- The $25 / 6% / 150+ / 0% numbers become a full-width band with dividers, not a floating grey box.

**How it works**
- Three steps in one row, big ghosted numerals, short lines, consistent spacing.

**Everything else below**
- Feature sections get a shared rhythm: same vertical spacing, same heading size, same card style — the main reason the page currently feels uneven.

**Auth, legal and 404 pages**
- Same type scale, spacing and card style so the whole site feels like one product.

## What does not change

Features, copy meaning, pricing, and all app behaviour stay exactly as they are. This is presentation only.

## Technical notes

- All colours, gradients and shadows stay as tokens in `src/index.css` + `tailwind.config.ts`; no hardcoded colour classes in components.
- Add display/body font pair and a tightened type scale to the Tailwind theme.
- Refactor `src/pages/LandingPage.tsx` section by section; shared section wrapper for consistent rhythm.
- Reuse existing `AppShowcase` device preview; only its framing/spacing changes.
- All new motion respects `useReducedMotion`.
