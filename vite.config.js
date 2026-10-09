import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      '/rpt-api': {
        target: 'http://192.168.1.24:89/RPT/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpt-api/, ''),
      },
      '/rpt_api': {
        target: 'http://192.168.1.24:89/RPT/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpt_api/, ''),
      },
    },
  },
})
