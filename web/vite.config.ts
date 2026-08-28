import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Gestão de Encomendas — Condomínio',
        short_name: 'Encomendas',
        description: 'Sistema de recebimento e gestão de encomendas para condomínios.',
        theme_color: '#dc2626',
        background_color: '#171717',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\/storage\/v1\/object\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'storage-images' },
          },
          {
            urlPattern: /\/rest\/v1\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/functions/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/auth/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/rest/v1': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
    },
  },
})
