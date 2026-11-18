import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/bks-team/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'], react: ['react', 'react-dom'] } },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.js'] },
})
