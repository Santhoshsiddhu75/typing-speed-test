import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Deploy to root of Vercel domain
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Build output and test artefacts are not source. Watching them means a
    // `npm run build` while the dev server is up rewrites files the watcher
    // holds open, which on Windows throws EBUSY and kills the server — the
    // dev server dies silently and the browser quietly serves stale code.
    watch: {
      ignored: [
        '**/dist/**',
        '**/playwright-report/**',
        '**/test-results/**',
        '**/server/dist/**',
        '**/scratch/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})