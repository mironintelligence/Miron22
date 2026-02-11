/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        fg: "#FFFFFF",
        accent: "#FFD700",
      },
      fontFamily: {
        heading: ["Abril Fatface", "serif"],
        subheading: ["Libre Baskerville", "serif"],
        body: ["Akzidenz-Grotesk", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
