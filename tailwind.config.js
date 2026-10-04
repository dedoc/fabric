import colors from 'tailwindcss/colors.js'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
      },
      typography: {
        // Typography palettes are defined independently of theme.colors.
        gray: typography().config.theme.typography.neutral,
      },
      fontFamily: {
        'jetbrains-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
    },
  },
  plugins: [
    typography,
  ],
}
