import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Dev-only proxy so the frontend can call /api/* without CORS at this stage.
    // In prod the frontend talks to VITE_API_BASE_URL directly (Vercel → MonsterASP).
    proxy: {
      '/api': {
        target: 'http://localhost:5223',
        changeOrigin: true,
      },
    },
  },
})
