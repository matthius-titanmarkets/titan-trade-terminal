/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Titan Markets LLC brand system — obsidian institutional base + titan gold
        obsidian: {
          950: '#03050A', // terminal deep
          900: '#05070D', // app base
          850: '#070B14',
          800: '#0A0E17', // panel
          750: '#0C111D',
          700: '#0F1524', // panel raised
          600: '#141B2E',
          500: '#1A2338',
        },
        line: {
          DEFAULT: '#161E30',
          soft: '#111827',
          strong: '#233049',
          gold: 'rgba(201,164,58,0.28)',
        },
        titan: {
          gold: '#C9A43A',
          bright: '#E8C766',
          deep: '#96762A',
          faint: 'rgba(201,164,58,0.10)',
        },
        ink: {
          DEFAULT: '#E7EAF2',
          soft: '#A7B0C3',
          dim: '#6B7689',
          faint: '#465064',
        },
        market: {
          up: '#19C784',
          upDim: 'rgba(25,199,132,0.12)',
          down: '#EF4353',
          downDim: 'rgba(239,67,83,0.12)',
          neutral: '#8A93A6',
        },
        accent: {
          blue: '#4C7EF3',
          violet: '#8B7CF6',
          amber: '#F5B93F',
        },
      },
      fontFamily: {
        brand: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      letterSpacing: {
        caps: '0.16em',
        wide2: '0.24em',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.02) inset, 0 10px 30px -18px rgba(0,0,0,0.8)',
        goldglow: '0 0 0 1px rgba(201,164,58,0.25), 0 8px 40px -12px rgba(201,164,58,0.25)',
        modal: '0 24px 80px -20px rgba(0,0,0,0.9)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        flashUp: {
          '0%': { backgroundColor: 'rgba(25,199,132,0.28)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(239,67,83,0.28)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        marquee: 'marquee 60s linear infinite',
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        flashUp: 'flashUp 0.9s ease-out',
        flashDown: 'flashDown 0.9s ease-out',
      },
    },
  },
  plugins: [],
}
