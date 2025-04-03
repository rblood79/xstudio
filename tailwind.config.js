/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                custom: {
                    50: 'var(--color-custom-50)',
                    100: 'var(--color-custom-100)',
                    200: 'var(--color-custom-200)',
                    300: 'var(--color-custom-300)',
                    400: 'var(--color-custom-400)',
                    500: 'var(--color-custom-500)',
                    600: 'var(--color-custom-600)',
                    700: 'var(--color-custom-700)',
                    800: 'var(--color-custom-800)',
                    900: 'var(--color-custom-900)',
                    950: 'var(--color-custom-950)',
                }
            }
        },
    },
    safelist: [
        {
            pattern: /(bg|text|border|ring|accent)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|custom)-(50|100|200|300|400|500|600|700|800|900|950)/,
            variants: ['hover', 'focus', 'active'],
        },
        'ring-2',
        'ring-offset-2'
    ],
    plugins: [],
} 