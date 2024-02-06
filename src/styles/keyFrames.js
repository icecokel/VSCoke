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
        from: {
          opacity: 0,
          transform: "translateX(100px)",
        },
        to: {
          opacity: 1,
          transform: "translateX(0)",
        },
      },
      "@keyframes slide-left-close": {
        from: {
          opacity: 1,
          transform: "translateX(0)",
        },
        to: {
          opacity: 0,
          transform: "translateX(100px)",
        },
      },
      "@keyframes slide-up": {
        from: {
          opacity: 0,
          transform: "translateY(100px)",
        },
        to: {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slide-up-close": {
        from: {
          opacity: 1,
          transform: "translateY(0)",
        },
        to: {
          opacity: 0,
          transform: "translateY(100px)",
        },
      },
      "@keyframes slide-down": {
        from: {
          opacity: 0,
          transform: "translateY(-100px)",
        },
        to: {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slide-down-close": {
        from: {
          opacity: 1,
          transform: "translateY(0)",
        },
        to: {
          opacity: 0,
          transform: "translateY(-100px)",
        },
      },
      "@keyframes slide-right": {
        from: {
          opacity: 0,
          transform: "translateX(-100px)",
        },
        to: {
          opacity: 1,
          transform: "translateX(0px)",
        },
      },
      "@keyframes slide-right-close": {
        from: {
          opacity: 1,
          transform: "translateX(0)",
        },
        to: {
          opacity: 0,
          transform: "translateX(-100px)",
        },
      },
    },
  };

  addUtilities(keyframes);
});
