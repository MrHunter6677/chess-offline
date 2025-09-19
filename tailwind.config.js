const defaultTheme = require('tailwindcss/defaultTheme')
// tailwind.config.js
module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                savate: ['"Savate"', 'sans-serif'],
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
        },
    },
    plugins: [],
}
