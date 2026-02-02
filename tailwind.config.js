export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--color-brand-bg)",
          surface: "var(--color-brand-surface)",
          surfaceStrong: "var(--color-brand-surfaceStrong)",
          outline: "var(--color-brand-outline)",
          border: "var(--color-brand-border)",
          text: "var(--color-brand-text)",
          mainText: "var(--color-brand-main-text)",
          muted: "var(--color-brand-muted)",
          accent: "var(--color-brand-accent)",
          accentStrong: "var(--color-brand-accentStrong)",
          success: "var(--color-brand-success)",
          danger: "var(--color-brand-danger)"
        }
      },
      fontFamily: {
        sans: ["Manrope", "League Spartan", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Roboto Serif", "serif"],
        display: ["Felipa", "Playfair Display", "serif"]
      }
    }
  },
  plugins: []
};
