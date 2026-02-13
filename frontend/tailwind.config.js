/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light: '#3B82F6',
          lighter: '#93C5FD'
        },
        secondary: '#3B82F6',
        accent: '#93C5FD',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        text: {
          DEFAULT: '#1F2933',
          light: '#64748B'
        },
        border: '#E5E7EB',
        success: '#22C55E',
        warning: '#FACC15',
        error: '#EF4444',
        info: '#3B82F6'
      }
    },
  },
  plugins: [],
}