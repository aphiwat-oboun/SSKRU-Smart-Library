/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './Index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E7548',
          hover: '#165B37',
          light: '#E8F3EC'
        },
        sidebar: {
          bg: '#144D32',
          active: '#2E694C',
          text: '#D1E7DA'
        },
        appbg: '#F3F7F4',
        surface: '#FFFFFF',
        subtle: '#F4F8F5',
        ink: {
          DEFAULT: '#111827',
          secondary: '#4B5563',
          muted: '#9CA3AF'
        },
        success: {
          DEFAULT: '#1E7548',
          bg: '#E3F2EA',
          border: '#B7DFC8'
        },
        warning: {
          DEFAULT: '#EAB308',
          bg: '#FDECC8',
          border: '#E6B84D',
          text: '#854D0E'
        },
        info: {
          DEFAULT: '#1E40AF',
          bg: '#E3ECFA',
          border: '#BFDBFE'
        },
        danger: {
          DEFAULT: '#A32A1C',
          hover: '#862115',
          bg: '#FEE2E2',
          soft: '#FFF5F5',
          border: '#FECACA'
        },
        line: {
          DEFAULT: '#E2EBE5',
          strong: '#C9D8CE'
        }
      },
      fontFamily: {
        sans: ['Noto Sans Thai', 'Sarabun', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
