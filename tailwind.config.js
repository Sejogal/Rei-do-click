/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f10",
        surface: "#1a1a1c",
        text: "#e2e2e2",
        sub: "#646669",
        accent: "#e2b714",
        error: "#ca4754",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};