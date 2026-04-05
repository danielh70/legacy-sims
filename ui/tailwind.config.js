/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#1a1a1a',
          800: '#222222',
          700: '#2a2a2a',
          600: '#333333',
          500: '#444444',
        },
        accent: {
          orange: '#e8a629',
          yellow: '#f0c040',
          red: '#e05050',
          green: '#50c878',
          blue: '#5090d0',
        },
      },
    },
  },
  plugins: [],
};
