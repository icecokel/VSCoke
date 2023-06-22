/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      gray: {
        50: "#D7D7D7",
        100: "#CCCCCC",
        300: "#8C8C8C",
        500: "#4C4C4C",
        700: "#2A2A2A",
        800: "#1F1F1F",
        900: "#181818",
      },
      blue: {
        100: "#0078D4",
      },
      yellow: {
        100: "#D68F34",
        200: "#CCA700",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
