import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      process.env.SENTRY_AUTH_TOKEN
        ? sentryVitePlugin({
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            release: { name: process.env.VITE_APP_RELEASE || process.env.GITHUB_SHA },
            sourcemaps: { assets: './dist/**' },
          })
        : null,
    ].filter(Boolean),
    server: {
      port: 5173,
      strictPort: true,
      // Dev-only proxy so the frontend can call /api/* without CORS at this stage.
      // In prod the frontend talks to VITE_API_BASE_URL directly (Vercel → MonsterASP).
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5223',
          changeOrigin: true,
        },
      },
    },
  };
})
