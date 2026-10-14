import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Design system type scale (one scale for app pages): caption < body (text-sm) < heading < title < figure (balances).
      fontSize: {
        caption: ['0.6875rem', { lineHeight: '1rem' }],
        heading: ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        title: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        figure: ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-xl': ['clamp(2.75rem, 5.5vw, 4.25rem)', { lineHeight: '1.03', letterSpacing: '-0.035em', fontWeight: '700' }],
        'display-lg': ['clamp(2rem, 3.6vw, 3rem)', { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-md': ['clamp(1.5rem, 2.4vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '600' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-surface': 'var(--gradient-surface)',
      },
      boxShadow: {
        'card-hover': 'var(--shadow-card-hover)',
        'sheet': 'var(--shadow-sheet)',
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)',
        'accent': 'var(--shadow-accent)',
        'accent-strong': 'var(--shadow-accent-strong)',
      },
      borderRadius: {
        card: "var(--radius-card)",
        sheet: "var(--radius-sheet)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "exo-breathe": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--accent) / 0.0), 0 0 6px 0 hsl(var(--accent) / 0.15)" },
          "50%": { transform: "scale(1.04)", boxShadow: "0 0 0 2px hsl(var(--accent) / 0.25), 0 0 16px 2px hsl(var(--accent) / 0.35)" },
        },
        "exo-breathe-strong": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--accent) / 0.1), 0 0 8px 0 hsl(var(--accent) / 0.3)" },
          "50%": { transform: "scale(1.07)", boxShadow: "0 0 0 3px hsl(var(--accent) / 0.45), 0 0 24px 4px hsl(var(--accent) / 0.55)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "exo-breathe": "exo-breathe 3s ease-in-out infinite",
        "exo-breathe-strong": "exo-breathe-strong 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
