/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Acento cálido pero saturado (terracota), no el café apagado de antes.
        brand: {
          50: '#fff5ed',
          100: '#ffe8d4',
          200: '#ffcda8',
          300: '#ffa971',
          400: '#fd7a38',
          500: '#fb5711',
          600: '#ec3d07',
          700: '#c32c08',
          800: '#9b250f',
          900: '#7d2210',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.03em',
      },
      boxShadow: {
        // Sombras suaves en capas: se ven mucho mejor que la sombra dura
        // por defecto, sobre todo en tarjetas grandes.
        suave: '0 1px 2px rgba(16,15,14,0.04), 0 4px 12px rgba(16,15,14,0.06)',
        elevada: '0 2px 4px rgba(16,15,14,0.05), 0 12px 28px rgba(16,15,14,0.10)',
      },
      transitionTimingFunction: {
        suave: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        aparecer: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        subir: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        desplegar: {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        brillo: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        aparecer: 'aparecer 220ms cubic-bezier(0.32, 0.72, 0, 1) both',
        subir: 'subir 380ms cubic-bezier(0.32, 0.72, 0, 1) both',
        desplegar: 'desplegar 220ms cubic-bezier(0.32, 0.72, 0, 1) both',
        brillo: 'brillo 1.6s infinite',
      },
    },
  },
  plugins: [],
};
