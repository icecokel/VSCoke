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
        84: "#D7D7D7",
        80: "#CCCCCC",
        55: "#8C8C8C",
        30: "#4C4C4C",
        16: "#2A2A2A",
        12: "#1F1F1F",
        9: "#181818",
      },
      blue: {
        42: "#0078D4",
      },
      yellow: {
        52: "#D68F34",
        40: "#CCA700",
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
