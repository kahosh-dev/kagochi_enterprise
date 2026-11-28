import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// During development the browser talks only to Vite (http://localhost:5173);
// Vite forwards /api requests to the Express backend so the session cookie is
// first-party and no API address is hard-coded in the frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.e2b.app'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? 'http://localhost:3001',
        changeOrigin: false,
      },
    },
  },
})
