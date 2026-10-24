import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07060d",
        panel: "#120b22",
        bagi: "#2ee6d6", // teal — cooperate (BAGI / share)
        embat: "#ff2e63", // hot red — betray (EMBAT / steal)
        gold: "#ffd23f", // jackpot
        mon: "#836ef9", // Monad purple
      },
      fontFamily: {
        display: ["var(--font-display)", "Orbitron", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "Oxanium", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "neon-bagi": "0 0 18px rgba(46,230,214,0.55), inset 0 0 10px rgba(46,230,214,0.25)",
        "neon-embat": "0 0 18px rgba(255,46,99,0.55), inset 0 0 10px rgba(255,46,99,0.25)",
        "neon-mon": "0 0 18px rgba(131,110,249,0.55)",
        "neon-gold": "0 0 22px rgba(255,210,63,0.6)",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.75", filter: "brightness(1.4)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
