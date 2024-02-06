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
      "@keyframes slideLeft": {
        from: {
          opacity: 0,
          transform: "translateX(100px)",
        },
        to: {
          opacity: 1,
          transform: "translateX(0)",
        },
      },
      "@keyframes slideLeftClose": {
        from: {
          opacity: 1,
          transform: "translateX(0)",
        },
        to: {
          opacity: 0,
          transform: "translateX(100px)",
        },
      },
      "@keyframes slideUp": {
        from: {
          opacity: 0,
          transform: "translateY(100px)",
        },
        to: {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slideUpClose": {
        from: {
          opacity: 1,
          transform: "translateY(0)",
        },
        to: {
          opacity: 0,
          transform: "translateY(100px)",
        },
      },
      "@keyframes slideDown": {
        from: {
          opacity: 0,
          transform: "translateY(-100px)",
        },
        to: {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
      "@keyframes slideDownClose": {
        from: {
          opacity: 1,
          transform: "translateY(0)",
        },
        to: {
          opacity: 0,
          transform: "translateY(-100px)",
        },
      },
      "@keyframes slideRight": {
        from: {
          opacity: 0,
          transform: "translateX(-100px)",
        },
        to: {
          opacity: 1,
          transform: "translateX(0)",
        },
      },
      "@keyframes slideRightClose": {
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
