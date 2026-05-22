/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design tokens — Vercel/Raycast dark style
        surface: {
          DEFAULT: '#111113',
          hover:   '#18181B',
          active:  '#1C1C1F',
        },
        // Keep primary as blue (Electric Blue)
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
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(-8px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        bounce3: {
          '0%,80%,100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        blink: 'blink 1s step-end infinite',
        bounce3: 'bounce3 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
