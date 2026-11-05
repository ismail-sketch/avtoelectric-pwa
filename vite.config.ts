import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // Старые сборки не должны копиться в dist: иначе service worker
  // предзагружает десятки устаревших файлов и приложение пухнет.
  build: {
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Помощник автоэлектрика',
        short_name: 'Автоэлектрик',
        description: 'Деревья диагностики, расчёты и журнал работ. Работает офлайн.',
        lang: 'ru',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Новый SW активируется сразу, не дожидаясь закрытия вкладок.
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
