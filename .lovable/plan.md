

# Desktop-Specific Screen Layouts for Laptop Mockup

## Summary
Create 7 new desktop-optimized screen components that leverage the wider laptop frame with multi-column grids, expanded charts, side-by-side panels, and data tables — instead of reusing the narrow phone screen components.

## What Changes

**File**: `src/components/AppShowcase.tsx`

### 1. Create 7 new `Desktop*Screen` components

Each mirrors its phone counterpart's data but uses wider layouts:

- **DesktopDashboardScreen**: 3-column top stats row (Balance, USD Wallet, Savings), side-by-side quick actions + recent activity, bottom feature grid in 4 columns
- **DesktopMarketsScreen**: Tabs + search in a top bar, featured Bitcoin chart taking ~60% width with asset list beside it, remaining assets in a compact data table with columns (Name, Price, Change, Sparkline)
- **DesktopCardsScreen**: Card visual on the left (~40%), card details + spending breakdown + quick actions on the right (~60%)
- **DesktopSavingsScreen**: Savings summary + goal progress bar on the left, transaction history on the right, wider interest chart spanning full width below
- **DesktopSendScreen**: Contact list on the left panel, send form + recent transfers on the right panel
- **DesktopAnalyticsScreen**: 2x2 grid of stat cards at top, full-width spending chart, category breakdown in a 3-column grid below
- **DesktopCryptoWalletScreen**: Portfolio overview + allocation donut on the left, holdings list as a proper table on the right with columns

### 2. Add a desktop screen component map

```typescript
const DESKTOP_SCREEN_COMPONENTS: Record<string, React.FC> = {
  dashboard: DesktopDashboardScreen,
  markets: DesktopMarketsScreen,
  cards: DesktopCardsScreen,
  savings: DesktopSavingsScreen,
  send: DesktopSendScreen,
  analytics: DesktopAnalyticsScreen,
  wallet: DesktopCryptoWalletScreen,
};
```

### 3. Update the laptop frame's content area

In the laptop frame section (~line 1277-1286), conditionally render desktop components:

```typescript
const ScreenComponent = deviceMode === "laptop" 
  ? DESKTOP_SCREEN_COMPONENTS[SCREENS[activeIndex].id]
  : SCREEN_COMPONENTS[SCREENS[activeIndex].id];
```

### Design Principles
- Same data/numbers as phone screens for consistency
- Text sizes slightly larger (phone uses 7-10px, desktop uses 8-11px) since there's more space
- Use `grid grid-cols-2` and `grid-cols-3` layouts extensively
- Wider SVG charts with more data points
- Tables instead of stacked lists where appropriate
- All using the same `Stagger` animation wrapper

