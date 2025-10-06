import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Risolve l'errore "import.meta" impostando un target di compilazione moderno.
    target: 'esnext' 
  }
})

