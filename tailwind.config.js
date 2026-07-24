/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#0B001A',
          plum: '#1A0B2E',
          card: '#1D1037',
        },
        primary: {
          purple: '#8B5CF6',
          violet: '#7C3AED',
          pink: '#EC4899',
          magenta: '#D946EF',
        },
        accent: {
          gold: '#F59E0B',
          yellow: '#FCD34D',
          green: '#10B981',
        },
        neutral: {
          silver: '#D1D5DB',
          grey: '#9CA3AF',
        }
      },
    },
  },
  plugins: [],
}
