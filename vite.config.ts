import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
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
})
