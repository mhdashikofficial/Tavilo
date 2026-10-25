import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        tavilo: {
          bg: "#07080a",
          surface: "#101319",
          card: "#161922",
          cardHover: "#1f2430",
          border: "#252b3b",
          borderLight: "#333b50",
          green: {
            DEFAULT: "#00e599",
            hover: "#00c985",
            dim: "rgba(0, 229, 153, 0.15)",
            glow: "rgba(0, 229, 153, 0.35)",
          },
          violet: {
            DEFAULT: "#9353d3",
            bright: "#a855f7",
            dim: "rgba(147, 83, 211, 0.15)",
            glow: "rgba(168, 85, 247, 0.35)",
          },
          text: {
            primary: "#f8fafc",
            secondary: "#94a3b8",
            muted: "#64748b",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.04)" },
        },
        wave: {
          "0%, 100%": { height: "4px" },
          "50%": { height: "20px" },
        },
      },
      animation: {
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
        wave: "wave 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
