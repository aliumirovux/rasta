import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `SINGLEFILE=1 vite build` → bitta HTML fayl (preview/artifact uchun), PWA o'chiriladi.
const single = process.env.SINGLEFILE === '1'

export default defineConfig({
  plugins: [
    react(),
    ...(single
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg'],
            manifest: {
              name: 'Rasta — sotuv va qoldiq hisobi',
              short_name: 'Rasta',
              description: "Avto-qismlar do'koni uchun sotuv, qoldiq va nasiya hisobi",
              lang: 'uz',
              start_url: '/',
              display: 'standalone',
              background_color: '#F4F5F7',
              theme_color: '#2456D6',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
                },
              ],
            },
          }),
        ]),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: single ? 'dist-single' : 'dist', target: 'es2020' },
  server: { port: 5173 },
})
