// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'dist-*/*', '.expo/*'] },
  {
    // Verbatim copies of web hooks (kept in sync with src/hooks on the web). The React
    // Compiler skips these patterns safely; report them as warnings instead of rewriting.
    files: ['src/hooks/useActiveCurrency.tsx', 'src/hooks/useForecastMarkets.ts', 'src/hooks/useSubscription.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
