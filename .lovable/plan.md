

# Fix Duplicate React Key Warning in Footer

## Problem
In the LandingPage footer (line 879-892), social media icons are mapped with `key={href}`, but both Twitter and Github have `href="#"`, causing a duplicate key `#` warning.

## Fix
**File**: `src/pages/LandingPage.tsx`, lines 879-892

Change the social icons array to include a `label` field and use that as the key instead of `href`:

```typescript
{[
  { icon: Twitter, href: "#", label: "twitter" },
  { icon: Github, href: "#", label: "github" },
  { icon: Mail, href: "mailto:support@exosky.app", label: "mail" },
].map(({ icon: Icon, href, label }) => (
  <motion.a
    key={label}
    href={href}
    ...
```

Single line change, fixes the console error completely.

