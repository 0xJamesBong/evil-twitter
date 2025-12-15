/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
        "abc-favorit": ["var(--font-abc-favorit)", "Arial", "Helvetica", "sans-serif"],
        goetsuan: ["var(--font-goetsusioji)", "Arial", "Helvetica", "sans-serif"],
        cantonese: ["var(--font-jyutcitzi)", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};