/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        // Støvle palette
        bg:       '#f7f3ec',
        paper:    '#fffdf8',
        ink:      '#1c1b18',
        ink2:     '#57544c',
        ink3:     '#8b8679',
        line:     '#e6dfd1',
        line2:    '#efe9dc',
        moss:     '#4a6140',
        mossBg:   '#e4ebd9',
        rust:     '#b5532a',
        rustBg:   '#f6e3d6',
        amber:    '#a06b16',
        amberBg:  '#f3e3c0',
        sky:      '#3c5c7a',
        skyBg:    '#dae4ee',
      },
      fontFamily: {
        sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightish: '-0.01em',
        tight2:   '-0.02em',
      },
    },
  },
  plugins: [],
}
