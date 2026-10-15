/// <reference types="jest" />
import { apyForBoost, mentionedTickers, parseAllocation, parseItinerary, parseProducts, projectSeries } from '@/lib/exo';
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} }, SUPABASE_URL: 'https://x', SUPABASE_PUBLISHABLE_KEY: 'k' }));

describe('Exo rich card parsers', () => {
  it('parses a Governor allocation', () => {
    const rows = parseAllocation('Governor rebalance:\n- **SPY**: 60% (core)\n- BTC: 10%\n- Cash: 30%');
    expect(rows.map((r) => [r.symbol, r.pct])).toEqual([['SPY', 60], ['BTC', 10], ['CASH', 30]]);
  });
  it('ignores lists without allocation context', () => {
    expect(parseAllocation('- Milk: 2%')).toEqual([]);
  });
  it('parses an itinerary', () => {
    const rows = parseItinerary('**Day 1**: Fly in\n- Day 2 — Hike');
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe('Day 1');
  });
  it('finds products with prices and tickers', () => {
    expect(parseProducts('- [Lamp](https://shop.example.com/x) $39.99').length).toBe(1);
    expect(mentionedTickers('BTC and AAPL look fine').map((t) => t.symbol).length).toBeGreaterThan(0);
  });
  it('applies tier APY and grows the projection', () => {
    expect([0, 2, 3, 4].map(apyForBoost)).toEqual([6, 8, 9, 10]);
    const s = projectSeries(1000, 6);
    expect(s[s.length - 1]).toBeGreaterThan(s[0]);
  });
});
