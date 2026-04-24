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
        accent: {
          DEFAULT: '#4f46e5',
          soft: '#eef2ff',
        },
      },
      boxShadow: {
        panel: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
