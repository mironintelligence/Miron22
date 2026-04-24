/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        fg: "#FFFFFF",
        accent: "#FFD700",
        // Dashboard design system (extends only; existing classes untouched)
        surface: "#0a0a0a",
        elevated: "#111111",
        hair: "#1e1e1e",
        "hair-hover": "#2e2e2e",
        muted: "#888888",
        faint: "#3a3a3a",
        "accent-dim": "#4a3a00",
        "accent-text": "#b8960a",
        "hub-dava": "#FFD700",
        "hub-arastirma": "#4c8cc9",
        "hub-belge": "#4cc98c",
      },
      fontFamily: {
        heading: ["Abril Fatface", "serif"],
        subheading: ["Libre Baskerville", "serif"],
        body: ["Akzidenz-Grotesk", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        // Dashboard stack
        display: ['"Abril Fatface"', "serif"],
        serif: ['"Libre Baskerville"', "serif"],
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        btn: "8px",
        pill: "9999px",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        pulseDot: "pulseDot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
