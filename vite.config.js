import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
    // Fix for spaces in path (Windows username with spaces)
    fs: {
      strict: false
    }
  },
  // Additional fix for path resolution
  resolve: {
    preserveSymlinks: true
  }
})
