import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        noir: "#050708",
        gold: "#e4bd73",
        cyanNoir: "#009ec4",
      },
    },
  },
  plugins: [],
};

export default config;
