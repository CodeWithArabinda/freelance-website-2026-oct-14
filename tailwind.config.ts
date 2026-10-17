import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
          900: "#14532d",
        },
        accent: {
          50: "#f5f3ff",
          100: "#ede9fe",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        }
      },
    },
  },
  plugins: [],
};
export default config;
