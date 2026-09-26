/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1B2B48', // Reference Deep Navy Blue
          700: '#15223A',
          800: '#121E34',
          900: '#0B1324',
          navy: '#1B2B48',
          navyDark: '#121E34',
          navyLight: '#283D64',
        },
        action: {
          50: '#EBF7EC',
          100: '#D4EED7',
          500: '#439346',
          600: '#439346', // Reference Action Green
          700: '#387F3B',
          800: '#2E6930',
          green: '#439346',
          greenHover: '#387F3B',
        },
        surface: {
          bg: '#F4F6F9',
          card: '#FFFFFF',
          dark: '#1B2B48',
          darker: '#121E34',
          sidebar: '#121E34',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card-hover': '0 20px 40px -15px rgba(37, 99, 235, 0.12)',
        'emerald-glow': '0 10px 25px -5px rgba(5, 150, 105, 0.4)',
        'blue-glow': '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
