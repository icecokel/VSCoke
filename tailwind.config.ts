import type { Config } from "tailwindcss";
import { colors } from "./src/styles/colors";
import { breakPoints } from "./src/styles/break-points";
import keyFrames from "./src/styles/keyFrames";

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors,
    screens: {
      xs: `${breakPoints.xs}px`,
      // => @media (min-width: 0px) { ... }
      sm: `${breakPoints.sm}px`,
      // => @media (min-width: 600px) { ... }
      md: `${breakPoints.md}px`,
      // => @media (min-width: 900px) { ... }
      lg: `${breakPoints.lg}px`,
      // => @media (min-width: 1200px) { ... }
      xl: `${breakPoints.xl}px`,
      // => @media (min-width: 1440px) { ... }
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [keyFrames],
};
export default config;
