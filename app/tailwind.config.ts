import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
      },
    },
  },
  plugins: [],
};

export default config;