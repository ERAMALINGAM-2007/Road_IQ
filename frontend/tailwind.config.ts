import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode via data attribute on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    // ── Override ALL Tailwind defaults with our design system ──────────────
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      // Light mode / shared
      paper: 'var(--paper)',
      surface: 'var(--surface)',
      ink: 'var(--ink)',
      'ink-muted': 'var(--ink-muted)',
      rule: 'var(--rule)',
      asphalt: 'var(--asphalt)',
      marking: 'var(--marking)',
      accent: 'var(--accent)',
      ok: 'var(--ok)',
      // Severity
      'sev-low': 'var(--sev-low)',
      'sev-medium': 'var(--sev-medium)',
      'sev-high': 'var(--sev-high)',
      'sev-critical': 'var(--sev-critical)',
      // Semantic
      info: 'var(--info)',
      warning: 'var(--warning)',
      error: 'var(--error)',
      success: 'var(--success)',
      // White/black for overlays
      white: '#ffffff',
      black: '#000000',
    },
    fontFamily: {
      display: ['Fraunces Variable', 'Georgia', 'serif'],
      sans: ['Instrument Sans', 'Helvetica Neue', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace'],
    },
    fontSize: {
      '2xs':['0.6875rem', { lineHeight: '1.2' }],
      xs:   ['0.75rem',   { lineHeight: '1.3' }],
      sm:   ['0.875rem',  { lineHeight: '1.45' }],
      base: ['1rem',      { lineHeight: '1.6' }],
      md:   ['1.125rem',  { lineHeight: '1.4' }],
      lg:   ['1.375rem',  { lineHeight: '1.35' }],
      xl:   ['1.75rem',   { lineHeight: '1.25' }],
      '2xl':['2.25rem',   { lineHeight: '1.18' }],
      '3xl':['3rem',      { lineHeight: '1.12' }],
    },
    borderRadius: {
      none: '0',
      sm:   '2px',
      DEFAULT: '4px',
      md:   '6px',
      full: '9999px',
    },
    boxShadow: {
      sm:  '1px 1px 0 rgba(27,26,23,.06)',
      DEFAULT: '2px 2px 0 rgba(27,26,23,.08)',
      md:  '3px 3px 0 rgba(27,26,23,.10)',
      lg:  '4px 4px 0 rgba(27,26,23,.12)',
      none: 'none',
    },
    extend: {
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};

export default config;
