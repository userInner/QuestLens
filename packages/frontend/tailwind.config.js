/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-pink': '#ff006e',
        'cyber-cyan': '#00f5ff',
        'cyber-purple': '#8338ec',
        'cyber-dark': '#0a0a0f',
        'cyber-gray': '#1a1a2e',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
