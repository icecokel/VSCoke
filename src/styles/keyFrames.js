const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addUtilities }) {
  const keyframes = {
    beat: {
      "@keyframes beat": {
        "10%": { transform: "scale(0.6)" },
        "33.33%": { transform: "scale(1.3)" },
        "50%": { transform: "scale(1)" },
        "60%": { transform: "scale(1.08)" },
        "80%": { transform: "scale(1)" },
        "100%": { transform: "scale(1)" },
      },
    },
    slide: {
      "@keyframes slideUp": {
        from: "",
        to: "",
      },
      "@keyframes slideRight": {
        from: {
          transform: "translateX(-100px)",
        },
        to: {
          transform: "translateX(0)",
        },
      },
    },
  };

  addUtilities(keyframes);
});
