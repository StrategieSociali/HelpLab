//vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 👇 ALIAS: import "@/..."
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // 👇 DEV SERVER su 5173 + PROXY verso produzione (evita CORS)
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.helplab.space',
        changeOrigin: true,
        secure: false,
        // nessuna rewrite: l'API reale espone già /api/...
      },
    },
  },
})

