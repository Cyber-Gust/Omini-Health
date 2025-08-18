/** @type {import('tailwindcss').Config} */
module.exports = {
  // O darkMode foi removido
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Nova paleta de cores simplificada
      colors: {
        brand: {
          light: '#88CADB',
          DEFAULT: '#ADDCDE', // Teal 500
          dark: '#4F90A1',
        },
        background: '#f8fafc', // Fundo cinza-claro (off-white)
        foreground: '#0f172a', // Texto principal escuro
        muted: '#64748b',      // Texto secundário (cinza)
        border: '#e2e8f0',      // Cor da borda suave
        bgheader: '#ADDCDE',
        border_light: '#88CADB', // Borda clara
        light: '#88CADB',
        DEFAULT: '#ADDCDE',
        dark: '#4F90A1'
      },
    },
  },
  plugins: [],
}
