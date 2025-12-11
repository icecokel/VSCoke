import type { Config } from "tailwindcss";
import { colors } from "./src/styles/colors";

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors,
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
