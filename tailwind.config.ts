import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#020203",
        carbon: "#08090b",
        ember: "#ff1a1a",
        crimson: "#b90000",
        oxide: "#320607",
        steel: "#b6bbc5",
      },
      boxShadow: {
        glow: "0 0 34px rgba(255, 26, 26, 0.35)",
        "glow-lg": "0 0 90px rgba(255, 26, 26, 0.28)",
      },
      animation: {
        pulseGlow: "pulseGlow 3.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        scan: "scan 7s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.65", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.025)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
