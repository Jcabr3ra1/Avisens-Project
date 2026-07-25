import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@app':      path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared':   path.resolve(__dirname, './src/shared'),
    },
  },

  // Proxy del servidor de desarrollo — igual a lo que hace nginx en Docker.
  // Redirige /api/* → http://localhost:3000/* sin necesitar .env.local
  // y evita errores de CORS porque la petición sale del mismo origen.
  server: {
    proxy: {
      '/api': {
        target:      'http://localhost:3000',
        changeOrigin: true,
        // Quita el prefijo /api antes de reenviar al backend
        // /api/auth/login  →  http://localhost:3000/auth/login
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
