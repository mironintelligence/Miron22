/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        fg: "#FFFFFF",
        accent: "#ebac00",
        // Dashboard design system (extends only; existing classes untouched)
        surface: "#0a0a0a",
        elevated: "#111111",
        hair: "#1e1e1e",
        "hair-hover": "#2e2e2e",
        muted: "#888888",
        faint: "#3a3a3a",
        "accent-dim": "#4a3a00",
        "accent-text": "#b8960a",
        "hub-dava": "#ebac00",
        "hub-arastirma": "#4c8cc9",
        "hub-belge": "#4cc98c",
        // Landing funnel tokens
        "surface-2": "#0d0d0d",
        "surface-3": "#111111",
        border: "#1a1a1a",
        "border-hover": "#2e2e2e",
        text: "#ffffff",
        "text-soft": "rgba(255,255,255,0.75)",
        "muted-2": "rgba(255,255,255,0.25)",
        gold: "#ebac00",
        "gold-dim": "rgba(235,172,0,0.10)",
        "gold-glow": "rgba(235,172,0,0.05)",
        danger: "#cc3333",
      },
      fontFamily: {
        heading: ["Abril Fatface", "serif"],
        subheading: ["Libre Baskerville", "serif"],
        body: ["Akzidenz-Grotesk", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        // Dashboard stack
        display: ['"Abril Fatface"', "serif"],
        serif: ['"Libre Baskerville"', "serif"],
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        sub: ['"Libre Baskerville"', "serif"],
        ui: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
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
        pulseSlow: {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.12)" },
        },
        blink: {
          "0%,50%": { opacity: "1" },
          "51%,100%": { opacity: "0" },
        },
      },
      animation: {
        pulseDot: "pulseDot 2s ease-in-out infinite",
        "pulse-slow": "pulseSlow 5s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        "spin-reverse": "spin 28s linear infinite reverse",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
