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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#00005a",
          light: "#1a1a7a",
          dark: "#00003d",
          50: "#e6e6f0",
          100: "#ccccdf",
          500: "#00005a",
          600: "#00005a",
          700: "#00003d",
        },
        secondary: {
          DEFAULT: "#8c000b",
          light: "#a6000d",
          dark: "#6b0008",
          50: "#f5e6e7",
          100: "#ebccce",
          500: "#8c000b",
          600: "#8c000b",
          700: "#6b0008",
        },
      },
    },
  },
  plugins: [],
};
export default config;

