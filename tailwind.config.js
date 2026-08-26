/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        paperdim: "var(--paperdim)",
        ink: "var(--ink)",
        inksoft: "var(--inksoft)",
        hairline: "var(--hairline)",
        amber: "var(--amber)",
        ambersoft: "var(--ambersoft)",
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
