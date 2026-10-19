/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        qs: {
          navy: '#0f172a',
          slate: '#1e293b',
          charcoal: '#334155',
          amber: '#d97706',
          ochre: '#b45309',
          gold: '#f59e0b',
          canvas: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          borderDark: '#cbd5e1',
          accent: '#2563eb',
        },
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#0f172a',
          600: '#1e293b',
          700: '#334155',
          800: '#020617',
        },
        stage: {
          advertised: '#2563eb',
          prequal: '#4f46e5',
          submitted: '#d97706',
          opened: '#ea580c',
          evaluated: '#0d9488',
          awarded: '#059669',
          archived: '#475569',
        }
      },
    },
  },
  plugins: [],
}
