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
          50: "#effaf6",
          100: "#d7f3e8",
          500: "#06c755", // LINE Green
          600: "#05ad4a",
          700: "#048c3c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
