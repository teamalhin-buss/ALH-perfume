/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./profile.html",
    "./**/*.{html,js}",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'yeseva': ['Yeseva One', 'cursive'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'primary': '#1a1a1a',
        'gold': '#D4AF37',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}