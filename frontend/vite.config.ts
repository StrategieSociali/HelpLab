import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 👇 ALIAS: abilita import tipo "@/..."
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // 👇 DEV SERVER su 8080 + PROXY verso la produzione (evita CORS)
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://api.helplab.space',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

