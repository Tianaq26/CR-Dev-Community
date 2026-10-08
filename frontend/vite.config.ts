import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Link-preview crawlers need an absolute image URL. Order of preference: VITE_SITE_URL (set it when you add a
 * custom domain), then the production domain Vercel exposes at build time, then the current Vercel address.
 */
function siteUrl(): string {
  const explicit = process.env.VITE_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'https://cr-dev-community-frontend.vercel.app'
}

const siteUrlPlugin: Plugin = {
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl()),
}

// In development the API runs on :5080; proxying keeps requests same-origin so no CORS setup is needed.
export default defineConfig({
  plugins: [react(), siteUrlPlugin],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5080', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
