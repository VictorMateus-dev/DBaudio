/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          500: '#0070f3',
          600: '#0058c4',
          700: '#004294',
          900: '#002554',
        },
        noise: {
          normal: '#10b981',    // green
          warning: '#f59e0b',   // yellow/amber
          critical: '#ef4444',  // red
          offline: '#6b7280',   // gray
        }
      }
    },
  },
  plugins: [],
}
