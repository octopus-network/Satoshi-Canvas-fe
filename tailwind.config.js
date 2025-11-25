/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 启用基于class的暗色模式
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BTC Orange color palette
        primary: {
          50: '#fff4e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa31a',
          500: '#F7931A', // BTC Orange
          600: '#cc7a15',
          700: '#996210',
          800: '#66490a',
          900: '#333105',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        pixel: ['Courier New', 'monospace'], // Pixel style font fallback
      },
      borderRadius: {
        'pixel': 'var(--radius)',
        'pixel-sm': 'var(--radius-sm)',
        'pixel-md': 'var(--radius-md)',
      },
      boxShadow: {
        'pixel-sm': 'var(--shadow-sm)',
        'pixel': 'var(--shadow)',
        'pixel-md': 'var(--shadow-md)',
        'pixel-lg': 'var(--shadow-lg)',
        'pixel-xl': 'var(--shadow-xl)',
      },
    },
  },
} 