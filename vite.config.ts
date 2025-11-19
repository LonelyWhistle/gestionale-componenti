import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumentiamo il limite dell'avviso a 3MB (3000kb) per non vedere l'avviso
    chunkSizeWarningLimit: 3000, 
    rollupOptions: {
      output: {
        // Questa funzione spezza il codice in file più piccoli per ottimizzare il caricamento
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Mette la libreria XLSX in un file separato
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            // Mette la libreria PDF in un file separato
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            // Mette Firebase in un file separato
            if (id.includes('firebase')) {
              return 'firebase';
            }
            // Tutto il resto va in 'vendor'
            return 'vendor';
          }
        },
      },
    },
  },
})
