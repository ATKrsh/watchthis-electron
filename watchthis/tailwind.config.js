/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#04060a',
        surface: '#080c14',
        'surface-elevated': '#0f1624',
        'surface-glass': 'rgba(12, 18, 30, 0.75)',
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          cyan: '#00f0ff',
          neon: '#00f5d4',
          magenta: '#f72585',
          amber: '#fbbf24',
          emerald: '#10b981',
          violet: '#8b5cf6',
          crimson: '#ef4444',
        },
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '3px',
        'md': '3px',
        'lg': '3px',
        'xl': '3px',
        '2xl': '3px',
        '3xl': '3px',
        'full': '3px',
      },
      fontFamily: {


        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.45)',
        'glow-neon': '0 0 25px -5px rgba(0, 245, 212, 0.45)',
        'glow-magenta': '0 0 25px -5px rgba(247, 37, 133, 0.45)',
        'glow-accent': '0 0 30px -5px rgba(99, 102, 241, 0.5)',
        'glow-crimson': '0 0 25px -5px rgba(239, 68, 68, 0.45)',
        'glow-amber': '0 0 25px -5px rgba(251, 191, 36, 0.45)',
        'dof-float': '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
