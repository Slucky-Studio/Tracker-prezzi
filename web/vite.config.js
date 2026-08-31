import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App puramente statica: nessun server, nessuna API da proxare.
// Su GitHub Pages il sito vive in un sottopercorso (/Tracker-prezzi/):
// la variabile BASE_PATH, impostata dal workflow di deploy, la gestisce.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { host: true },
  build: { outDir: 'dist', emptyOutDir: true }
})
