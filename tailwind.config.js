/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    theme: {
        extend: {
            colors: {
                canvas: '#080a1b',
                panel: '#0b0e22',
                muted: '#9197ad',
                sync: {
                    DEFAULT: '#53e29c',
                    dark: '#23865a',
                },
            },
            boxShadow: {
                panel: '0 24px 80px rgba(8, 9, 15, 0.36)',
                glow: '0 12px 32px rgba(74, 237, 136, 0.2)',
            },
            keyframes: {
                'rise-in': {
                    '0%': { opacity: '0', transform: 'translateY(18px) scale(0.985)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
                    '50%': { transform: 'translate3d(14px, 10px, 0) rotate(3deg)' },
                },
                'float-slow-reverse': {
                    '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
                    '50%': { transform: 'translate3d(-12px, -9px, 0) rotate(-3deg)' },
                },
            },
            animation: {
                'rise-in': 'rise-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both',
                'float-slow': 'float-slow 14s ease-in-out infinite',
                'float-slow-reverse': 'float-slow-reverse 16s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
