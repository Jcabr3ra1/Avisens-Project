# ---------- Etapa 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# URL del backend para el build de Vite. En docker NO se usa localhost:
# el navegador pega a /api y nginx lo redirige al servicio backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ---------- Etapa dev: hot-reload (vite dev server) ----------
# Solo se usa en local via docker-compose.override.yml (el código real llega
# por bind mount, no por este COPY). Producción usa la etapa runner de abajo.
FROM builder AS dev
EXPOSE 80
# La imagen base ya trae node -- sin instalar nada nuevo, igual que el
# healthcheck del backend.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:80/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

# ---------- Etapa 2: servir estáticos con nginx ----------
FROM nginx:alpine AS runner

# Configuración propia: sirve la SPA y hace de proxy hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
# nginx:alpine ya trae wget (confirmado: /usr/bin/wget) -- sin apk add.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
