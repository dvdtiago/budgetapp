/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        // Brand — warm amber-orange
        brand: {
          50:  '#FEF3E8',
          100: '#FDE4C8',
          200: '#FBCB97',
          300: '#F7A85E',
          400: '#F0893A',
          500: '#E07030',
          600: '#C45C22',
          700: '#A04A18',
          800: '#7C3B14',
          900: '#5E2E10',
        },
        // Sage — surplus / positive states
        sage: {
          50:  '#EDFAF3',
          100: '#D4F3E3',
          200: '#A9E7C8',
          300: '#72D4A5',
          400: '#45BF85',
          500: '#2EA66D',
          600: '#228754',
          700: '#1A6B41',
          800: '#145132',
          900: '#0F3D25',
        },
        // Warm amber — warnings / behind schedule
        amber: {
          50:  '#FFFAEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // Neutral — warm-toned grays
        neutral: {
          50:  '#FAFAF7',
          100: '#F4F4EF',
          200: '#E8E8E2',
          300: '#D4D4CC',
          400: '#A8A89E',
          500: '#7C7C72',
          600: '#5A5A52',
          700: '#3E3E38',
          800: '#28281F',
          900: '#18180F',
          950: '#0E0E08',
        },
      },
      borderRadius: {
        sm:      '8px',
        DEFAULT: '12px',
        md:      '12px',
        lg:      '18px',
        xl:      '24px',
        '2xl':   '28px',
      },
      boxShadow: {
        card:  '0 1px 3px rgb(0 0 0 / 0.05), 0 4px 16px rgb(0 0 0 / 0.06)',
        float: '0 8px 32px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06)',
        brand: '0 1px 3px rgb(192 92 34 / 0.35), 0 4px 12px rgb(192 92 34 / 0.20)',
      },
    },
  },
  plugins: [],
};
