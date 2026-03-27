/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
    './services/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
