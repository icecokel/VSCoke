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
      "@keyframes slide-left": {
        "0%": {
          opacity: 0,
          transform: "translateX(100%)",
        },
        "100%": {
          opacity: 1,
          transform: "translateX(0)",
        },
      },
      "@keyframes slide-left-close": {
        "0%": {
          opacity: 1,
          transform: "translateX(0)",
        },
        "100%": {
          opacity: 0,
          transform: "translateX(100%)",
          display: "none",
        },
      },
      "@keyframes slide-up": {
        "0%": {
          opacity: 0,
          transform: "translateY(100%)",
        },
        "100%": {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slide-up-close": {
        "0%": {
          opacity: 1,
          transform: "translateY(0)",
        },
        "100%": {
          opacity: 0,
          transform: "translateY(100%)",
          display: "none",
        },
      },
      "@keyframes slide-down": {
        "0%": {
          opacity: 0,
          transform: "translateY(-100%)",
        },
        "100%": {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slide-down-close": {
        "0%": {
          opacity: 1,
          transform: "translateY(0)",
        },
        "100%": {
          opacity: 0,
          transform: "translateY(-100%)",
          display: "none",
        },
      },
      "@keyframes slide-right": {
        "0%": {
          opacity: 1,
          transform: "translateX(-100%)",
        },
        "100%": {
          opacity: 1,
          transform: "translateX(0px)",
        },
      },
      "@keyframes slide-right-close": {
        "0%": {
          opacity: 1,
          transform: "translateX(0)",
        },
        "100%": {
          opacity: 0,
          transform: "translateX(-100%)",
          display: "none",
        },
      },
    },
  };

  addUtilities(keyframes);
});
