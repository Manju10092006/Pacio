module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Editorial light theme — cream paper + ink + electric cobalt
        ink: {
          900: "#0E0E10",  // primary text — rich near-black with cool undertone
          800: "#1B1B1F",
          700: "#2C2C32",
          500: "#6B6B66",
          400: "#9A998E",
        },
        bone: {
          50: "#FFFFFF",   // pure paper (cards)
          100: "#F4F0E8",  // warm cream — the canvas
          200: "#EDE8DD",  // depth tone
          300: "#E0D9CB",
        },
        accent: {
          DEFAULT: "#1538C8",   // ELECTRIC COBALT — signature ink
          hover: "#0E27A8",
          muted: "#DDE3FA",
        },
        amber: {
          DEFAULT: "#D97706",   // molten amber for KPI highlights
          soft: "#FBE9C9",
        },
        line: "rgba(14,14,16,0.10)",
      },
      fontFamily: {
        display: ["'Cabinet Grotesk'", "'Inter Tight'", "system-ui", "sans-serif"],
        serif: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Satoshi'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.15", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.3)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        marquee: "marquee 38s linear infinite",
        twinkle: "twinkle 3.4s ease-in-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
