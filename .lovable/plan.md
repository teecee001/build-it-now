

# Redesign Desktop Laptop Screens — PayPal-Style Layout

## Current Problem
The desktop screens inside the laptop mockup feel cramped and disorganized. Text is tiny (6-9px), grids are dense, and the layout doesn't reflect how a real desktop fintech app looks. The content is essentially "phone layout stretched wider" rather than a true desktop experience.

## Research: PayPal Desktop Dashboard Layout
From the PayPal web dashboard screenshot, the key patterns are:
- **Top horizontal navigation bar** (not sidebar) with tabs: Home, Activity, Sales, Finance, etc.
- **Two-column card layout**: Balance card on left, Quick Links grid on right
- **Clean white/light cards** with generous padding and breathing room
- **Insights section** below with Money In / Money Out stats
- **Actions section** with functional cards (invoicing, checkout)
- Large, readable text sizes — nothing below 12px equivalent
- Minimal visual noise — no gradients, no glows, just clean borders and whitespace

## Three UI Direction Options

### Option A: "PayPal Classic" — Top Nav + Card Grid
Closest to PayPal's actual dashboard. Horizontal top nav replaces sidebar. Clean card-based layout with generous spacing.

```text
+--------------------------------------------------+
| Logo   Home  Activity  Markets  Cards  Settings  |  (top nav bar)
+--------------------------------------------------+
| +----------------+  +-------------------------+  |
| | Balance        |  | Quick Actions           |  |
| | $24,856.32     |  | [Deposit] [Send] [Pay]  |  |
| | Available      |  | [Request] [Convert]     |  |
| +----------------+  +-------------------------+  |
|                                                  |
| +----------------+  +-------------------------+  |
| | Money In       |  | Recent Activity          |  |
| | $4,225.00      |  | Welcome Bonus  +$25     |  |
| |                |  | Deposit       +$4,200   |  |
| +----------------+  | Sent to Sarah  -$500    |  |
| | Money Out      |  +-------------------------+  |
| | $644.67        |                               |
| +----------------+                               |
+--------------------------------------------------+
```

- Pros: Matches PayPal exactly, professional, clean
- Cons: Loses the sidebar that mirrors your actual app

### Option B: "Revolut/Wise" — Sidebar + Spacious Cards
Keeps the sidebar (matches your real app) but dramatically improves spacing, card size, and readability. Like Revolut's web app.

```text
+--------+------------------------------------------+
| Logo   | Dashboard                     [Bell] [?] |
|        |------------------------------------------|
| Acct   | +------------+ +------------+ +--------+|
| Crypto | | Balance    | | USD Wallet | | Savings||
| Send   | | $24,856    | | $12,406    | | $12,450||
| Cards  | +------------+ +------------+ +--------+|
| Market |                                          |
| Save   | +-------------------+ +----------------+|
| ...    | | Quick Actions     | | Recent Activity||
|        | | [Dep] [Send] [Pay]| | Bonus  +$25    ||
| ----   | | [Req] [Conv]      | | Deposit +$4.2k ||
| User   | +-------------------+ +----------------+|
+--------+------------------------------------------+
```

- Pros: Consistent with your actual app's sidebar, modern fintech look
- Cons: Sidebar takes space in the small laptop mockup

### Option C: "Icon Rail + Wide Content" — Compact Nav, Maximum Content
Ultra-compact icon-only rail (no labels), maximizing content area. Like modern SaaS tools (Linear, Notion).

```text
+----+----------------------------------------------+
| ic | Dashboard                        [Bell] [?]  |
| ic |----------------------------------------------|
| ic | +--------------+ +--------------+ +---------+|
| ic | | Balance      | | USD Wallet   | | Savings ||
| ic | | $24,856.32   | | $12,406.32   | | $12,450 ||
| ic | +--------------+ +--------------+ +---------+|
| ic |                                               |
| ic | +---------------------+ +--------------------+|
|    | | Quick Actions       | | Recent Activity    ||
|    | | grid of 4 buttons   | | 3 transactions     ||
|    | +---------------------+ +--------------------+|
|    |                                               |
|    | +---------------------------------------------+|
|    | | Feature Cards: Card, QR, Multi-Currency, AI ||
|    | +---------------------------------------------+|
+----+----------------------------------------------+
```

- Pros: Maximum content space, sleek modern look
- Cons: Icons without labels may be less clear at tiny scale

## Shared Improvements (All Options)
- Increase text sizes: minimum 8px (currently 5-7px in places)
- Add more padding/margins between elements  
- Reduce information density per screen — show fewer items but bigger
- Use cleaner card borders (less transparency stacking)
- Make charts wider with more breathing room
- Apply same improvements to all 7 desktop screen components

## Technical Details
- **File changed**: `src/components/AppShowcase.tsx` only
- All 7 `Desktop*Screen` components will be rewritten
- `DesktopSidebar` component updated based on chosen option
- No new dependencies needed

