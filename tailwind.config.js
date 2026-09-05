/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/dashboard/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"]
      },
      colors: {
        ink: {
          950: "#0b1220",
          900: "#111827",
          800: "#1f2937"
        },
        accent: {
          500: "#0f766e",
          600: "#0d9488"
        }
      }
    }
  },
  plugins: []
};
