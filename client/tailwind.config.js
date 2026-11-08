/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "Arial Narrow", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
        // Kept as an alias so older `font-mono` labels pick up the condensed face
        mono: ["var(--font-display)", "Impact", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Fixed brand colours (same in light and dark)
        lime: { DEFAULT: "#C2FF1F", deep: "#9BE000" },
        forest: { DEFAULT: "#0E3B10", deep: "#082608", light: "#1C5E1F" },
        tangerine: "#FF7A1A",
        bubblegum: "#FF6FAE",
        sky: "#4FB8FF",
        sunny: "#FFD60A",
        kraft: { DEFAULT: "#C99B6A", dark: "#6B3E12" },
        paper: "#FBF6E3",
        // Legacy aliases used by the motion components
        ink: "#0E3B10",
        bone: "#FBF6E3",
        primary: {
          // Numbered scale (older pages use e.g. `bg-primary-600 text-white`)
          50: "#F1FDE6",
          100: "#E0FBC6",
          200: "#C6F78F",
          300: "#A6EE4F",
          400: "#86D726",
          500: "#5FAE17",
          600: "#2F7D14",
          700: "#1F6212",
          800: "#174D12",
          900: "#0F3A0F",
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 10px)",
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        // Solid offset "sticker" shadows
        sticker: "6px 7px 0 0 var(--sticker-shadow)",
        "sticker-sm": "3px 4px 0 0 var(--sticker-shadow)",
        "sticker-lg": "12px 14px 0 0 var(--sticker-shadow)",
        "sticker-lime": "10px 12px 0 0 #9BE000",
        lift: "0 18px 30px -12px rgba(8, 38, 8, 0.45)",
      },
      letterSpacing: {
        tightest: "-0.02em",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      animation: {
        marquee: "marquee var(--marquee-duration, 30s) linear infinite",
        "marquee-reverse":
          "marquee var(--marquee-duration, 30s) linear infinite reverse",
        "spin-slow": "spin 18s linear infinite",
        "page-in": "page-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "fade-up": "fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        kenburns: "kenburns 24s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
        wiggle: "wiggle 2.4s ease-in-out infinite",
        "wiggle-once": "wiggle 0.6s ease-in-out",
      },
      keyframes: {
        marquee: {
          from: { transform: "translate3d(0,0,0)" },
          to: { transform: "translate3d(-50%,0,0)" },
        },
        // Opacity only: a transform here would break position:fixed children
        "page-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0,24px,0)" },
          to: { opacity: "1", transform: "translate3d(0,0,0)" },
        },
        kenburns: {
          from: { transform: "scale(1.02)" },
          to: { transform: "scale(1.14) translate3d(-2%,-2%,0)" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-10px,0)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(var(--tilt, 0deg))" },
          "25%": { transform: "rotate(calc(var(--tilt, 0deg) - 3deg))" },
          "75%": { transform: "rotate(calc(var(--tilt, 0deg) + 3deg))" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
