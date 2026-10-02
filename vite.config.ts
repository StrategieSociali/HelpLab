//vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// Versione dell'app da package.json, iniettata nel bundle come sola stringa (bug #5,
// 2/10/2026): prima era scritta a mano in config/constants.jsx ed era ferma a '1.5'.
// Non si importa package.json nel codice: finirebbe nel sito pubblico per intero,
// con l'elenco delle dipendenze e delle loro versioni.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify(version),
  },

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

