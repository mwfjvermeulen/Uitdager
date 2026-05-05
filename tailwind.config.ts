import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#FF6B6B',
          teal: '#4ECDC4',
          yellow: '#FFE66D',
          green: '#6BCB77',
          purple: '#a18cd1',
          dark: '#0f0c29',
          mid: '#302b63',
          deep: '#1a1a2e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 1.5s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
