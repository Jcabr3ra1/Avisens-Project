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
    // Bind mount de Windows hacia el contenedor Docker: los eventos de
    // filesystem (inotify) no llegan, así que sin polling el hot-reload
    // nunca se dispara al editar desde el host.
    watch: {
      usePolling: true,
      interval: 300,
    },
    // Vite escucha en el puerto 80 dentro del contenedor, pero el navegador
    // carga la página por el puerto publicado en el host (8080). Sin esto,
    // el cliente de HMR intenta abrir el websocket contra localhost:80 (no
    // publicado) y los cambios nunca llegan solos al navegador.
    // HMR_CLIENT_PORT solo se define en docker-compose.override.yml: fuera
    // de Docker (npm run dev directo) queda undefined y Vite usa su default.
    hmr: process.env.HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.HMR_CLIENT_PORT) }
      : undefined,
  },
})
