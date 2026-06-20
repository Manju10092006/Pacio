module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#172033",
          950: "#101827",
          900: "#172033",
          800: "#24304a",
          700: "#35415d",
          500: "#64748b",
          400: "#94a3b8",
        },
        bone: {
          50: "#ffffff",
          100: "#f8fafc",
          200: "#eef2f7",
          300: "#dbe3ee",
        },
        accent: {
          DEFAULT: "#6657f5",
          hover: "#5141df",
          soft: "#eeecff",
        },
        rust: "#ff3d71",
        moss: "#10b981",
        ochre: "#f59e0b",
        cyan: "#06b6d4",
        violet: "#7257d8",
        paper: "#ffffff",
        line: "rgba(15,23,42,0.08)",
        "line-strong": "rgba(15,23,42,0.14)",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        serif: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SFMono-Regular'", "ui-monospace", "monospace"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slidein: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        slidein: "slidein 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
