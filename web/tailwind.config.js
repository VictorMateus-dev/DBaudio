export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#06060c',
          900: '#0a0b16',
          850: '#0f1022',
          800: '#15172e',
          700: '#1f2244',
        },
        vault: {
          purple: '#8b5cf6',
          violet: '#a855f7',
          fuchsia: '#d946ef',
          cyan: '#06b6d4',
          blue: '#3b82f6',
        },
        noise: {
          normal: '#10b981',
          warning: '#f59e0b',
          critical: '#ef4444',
          offline: '#6b7280',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.25)',
        'glow-violet': '0 0 35px rgba(168, 85, 247, 0.3)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.25)',
        'glass-card': '0 4px 30px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'vault-gradient': 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.18) 0%, rgba(6, 6, 12, 0) 70%)',
        'vault-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.25), rgba(255, 255, 255, 0))',
      }
    },
  },
  plugins: [],
}
