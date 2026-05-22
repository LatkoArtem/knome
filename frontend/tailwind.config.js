/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#111113',
          hover:   '#18181B',
          active:  '#1C1C1F',
        },
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.06)',
      },
      boxShadow: {
        // Inset glow on focus
        'glow-blue':   '0 0 0 3px rgba(37,99,235,0.15)',
        'glow-green':  '0 0 0 3px rgba(16,185,129,0.15)',
        'glow-rose':   '0 0 0 3px rgba(244,63,94,0.15)',
        // Card depth
        'card':        '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover':  '0 4px 12px rgba(0,0,0,0.4)',
        // Inner highlight for glass feel
        'inner-white': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: 0, transform: 'translateX(-8px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.97)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        bounce3: {
          '0%,80%,100%': { transform: 'translateY(0)' },
          '40%':          { transform: 'translateY(-5px)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition:  '200% 0' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: 0.6 },
          '50%':     { opacity: 1 },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.22s ease-out',
        'fade-up':    'fade-up 0.28s ease-out',
        'scale-in':   'scale-in 0.18s ease-out',
        'slide-in':   'slide-in 0.2s ease-out',
        blink:        'blink 1s step-end infinite',
        bounce3:      'bounce3 1.2s infinite ease-in-out',
        shimmer:      'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
