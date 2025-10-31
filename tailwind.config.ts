/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)'],
                mono: ['var(--font-mono)'],
            },
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
                },
                primary: {
                    50: 'var(--color-primary-50)',
                    100: 'var(--color-primary-100)',
                    200: 'var(--color-primary-200)',
                    300: 'var(--color-primary-300)',
                    400: 'var(--color-primary-400)',
                    500: 'var(--color-primary-500)',
                    600: 'var(--color-primary-600)',
                    700: 'var(--color-primary-700)',
                    800: 'var(--color-primary-800)',
                    900: 'var(--color-primary-900)',
                    950: 'var(--color-primary-950)',
                }
            }
        },
    },
    plugins: [],
} 