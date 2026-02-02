export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#18181B",
          surface: "#18181B",
          surfaceStrong: "#1d2230",
          outline: "#2a3040",
          border: "#2a3040",
          text: "#f8fafc",
          muted: "#a1a9b8",
          accent: "#f6a23a",
          accentStrong: "#ffb347",
          accentSoft: "#3b2a14",
          success: "#2bd576",
          danger: "#f87171"
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
