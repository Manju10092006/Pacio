module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#17191c",
          900: "#17191c",
          800: "#24262a",
          700: "#34373d",
          500: "#4c4c4c",
          400: "#777b86",
        },
        bone: {
          50: "#ffffff",
          100: "#f7f7f8",
          200: "#eceef2",
          300: "#dfe2e8",
        },
        accent: {
          DEFAULT: "#5d2a1a",
          hover: "#4b2115",
          soft: "#fbe1d1",
        },
        rust: "#5d2a1a",
        moss: "#496f5d",
        ochre: "#b8862e",
        sky: "#d3e3fc",
        apricot: "#fbe1d1",
        paper: "#ffffff",
        line: "rgba(23,25,28,0.10)",
        "line-strong": "rgba(23,25,28,0.16)",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "'Fraunces'", "Georgia", "serif"],
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        body: ["'Inter'", "'Satoshi'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "'Satoshi'", "system-ui", "sans-serif"],
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
