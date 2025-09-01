// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    globals: true,
    isolate: true,
    watch: false,
    reporters: ['basic'],
    pool: 'threads',
    testTimeout: 15000,  // <— più rilassato
    hookTimeout: 15000,  // <— idem
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
  },
})
