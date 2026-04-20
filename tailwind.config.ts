// This file tells Tailwind where to scan for class names.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7f4",
          100: "#e6ede7",
          500: "#3d6b52",
          700: "#284636",
          900: "#15261d"
        }
      }
    }
  },
  plugins: []
};

export default config;
