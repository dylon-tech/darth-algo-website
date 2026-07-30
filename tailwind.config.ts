import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#0D1117",
        secondary: "#161B22",
        card: "#1D2430",
        carbon: "#090D13",
        ember: "#DC3741",
        crimson: "#A8232D",
        oxide: "#32090D",
        steel: "#98A2B3",
        bull: "#00BE5F",
        bear: "#DC3741",
        swing: "#1E7DDC",
        scalp: "#EB9114",
        pro: "#8B5CF6",
      },
      boxShadow: {
        glow: "0 0 34px rgba(220, 55, 65, 0.3)",
        "glow-lg": "0 0 90px rgba(220, 55, 65, 0.22)",
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
          "linear-gradient(rgba(152,162,179,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(152,162,179,0.055) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
