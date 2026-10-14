// Web tokens (src/index.css, dark): background 240 10% 4%, accent/success 142 71% 45%.
export const C = {
  bg: '#09090B',
  card: '#121214',
  border: '#232326',
  text: '#FAFAFA',
  muted: '#8B8B93',
  green: '#22C55E',
  red: '#EF4444',
};
export const fmtUsd = (n: number, cur = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
};
