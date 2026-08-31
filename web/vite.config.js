import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La build finisce in web/dist e viene servita dallo stesso Express sulla 4173.
// In sviluppo (`npm run dev`) Vite gira sulla 5173 e gira le chiamate /api al server.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:4173',
      '/dati': 'http://localhost:4173'
    }
  },
  build: { outDir: 'dist', emptyOutDir: true }
})
