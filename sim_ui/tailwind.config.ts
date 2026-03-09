import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f4efe4',
        ink: '#11212b',
        panel: '#fbf8f0',
        accent: '#b45a2f',
        steel: '#2c4954',
        moss: '#708f6c',
        line: '#cdbba4',
      },
      boxShadow: {
        panel: '0 18px 40px rgba(17, 33, 43, 0.12)',
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)'],
        display: ['var(--font-space-grotesk)'],
      },
    },
  },
  plugins: [],
};

export default config;
