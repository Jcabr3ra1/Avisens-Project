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

# ---------- Etapa 2: servir estáticos con nginx ----------
FROM nginx:alpine AS runner

# Configuración propia: sirve la SPA y hace de proxy hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
