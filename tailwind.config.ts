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
        "wc-blue": "#0046AD",
        "wc-red": "#E4002B",
        "wc-gold": "#FFB81C",
        "wc-dark": "#0A0A0A",
        "wc-light": "#F5F5F5",
      },
    },
  },
  plugins: [],
};
export default config;
