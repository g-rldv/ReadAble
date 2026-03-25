/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Fredoka One for playful headings, Nunito for readable body text
        display: ['"Fredoka One"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
      },
      colors: {
        coral:  { DEFAULT: '#FF6B6B', light: '#FF9A9A', dark: '#E84545' },
        sunny:  { DEFAULT: '#FFD93D', light: '#FFE978', dark: '#F0C000' },
        mint:   { DEFAULT: '#6BCB77', light: '#9DDFAD', dark: '#4CAF5A' },
        sky:    { DEFAULT: '#4D96FF', light: '#85B8FF', dark: '#2B77F0' },
        grape:  { DEFAULT: '#9B59B6', light: '#C39BD3', dark: '#7D3C98' },
        cream:  { DEFAULT: '#FFF8F0', dark: '#1A1A2E' },
        card:   { DEFAULT: '#FFFFFF', dark: '#16213E' },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'float': 'float 3s ease-in-out infinite',
        'confetti': 'confetti 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'star-burst': 'starBurst 0.5s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        starBurst: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(2) rotate(180deg)', opacity: '0' },
        },
      },
      boxShadow: {
        'game': '0 6px 0 rgba(0,0,0,0.15)',
        'game-pressed': '0 2px 0 rgba(0,0,0,0.15)',
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'glow-coral': '0 0 20px rgba(255, 107, 107, 0.4)',
        'glow-mint': '0 0 20px rgba(107, 203, 119, 0.4)',
        'glow-sky': '0 0 20px rgba(77, 150, 255, 0.4)',
      },
    },
  },
  plugins: [],
};
