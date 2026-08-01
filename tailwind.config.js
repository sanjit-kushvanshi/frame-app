/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4EE",
        paperdim: "#EFEBE1",
        ink: "#1C1A17",
        inksoft: "#6B6459",
        hairline: "#DCD6C8",
        amber: "#FF6B35",
        ambersoft: "#FFE8DC",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
