/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        pix: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-light': 'glow-light 2s ease-in-out infinite alternate',
        'glow-dark': 'glow-dark 2s ease-in-out infinite alternate',
        'theme-transition': 'theme-transition 0.3s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-light': {
          'from': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
          'to': { boxShadow: '0 0 30px rgba(34, 197, 94, 0.6)' },
        },
        'glow-dark': {
          'from': { boxShadow: '0 0 20px rgba(52, 211, 153, 0.4)' },
          'to': { boxShadow: '0 0 30px rgba(52, 211, 153, 0.8)' },
        },
        'theme-transition': {
          'from': { opacity: '0.8' },
          'to': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}