export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        sidebar: '#12121a',
        card: '#1a1a28',
        primary: {
          50: '#ffffff',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
        secondary: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          DEFAULT: '#a3a3a3',
        },
        text: {
          primary: '#ffffff',
          secondary: '#e0e0e8',
          tertiary: '#a0a0b0',
        },
        dark: {
          950: '#050508',
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a28',
          600: '#242436',
          500: '#2e2e44',
        },
        accent: {
          cyan: '#ffffff',
          purple: '#a3a3a3',
          pink: '#d4d4d8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
        'player': '16px',
      },
      keyframes: {
        glow: {
          '0%, 100%': { filter: 'brightness(1) blur(0px)' },
          '50%': { filter: 'brightness(1.5) blur(2px)' },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right bottom'
          }
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
