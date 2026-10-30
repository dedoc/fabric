import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {'@': fileURLToPath(new URL('./src', import.meta.url))},
  },
  define: mode === 'library' ? {'process.env.NODE_ENV': JSON.stringify('production')} : undefined,
  build: mode === 'library' ? {
    copyPublicDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'Fabric',
      formats: ['iife'],
      fileName: () => 'fabric.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        inlineDynamicImports: true,
      },
    },
  } : undefined,
  server: {
    proxy: {
      '/spotify/open-api-schema.yaml': {
        target: 'https://developer.spotify.com',
        changeOrigin: true,
        rewrite: () => '/reference/web-api/open-api-schema.yaml',
      },
      '/converterer/openapi.json': {
        target: 'https://api.converterer.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/converterer/, ''),
      },
      '/docs/api.json': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
