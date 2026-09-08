/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6ee',
          100: '#f8e8d3',
          200: '#efcda3',
          300: '#e3aa6c',
          400: '#d68843',
          500: '#c46a28',
          600: '#a6521f',
          700: '#833f1c', // color principal
          800: '#6b3419',
          900: '#582c17',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
