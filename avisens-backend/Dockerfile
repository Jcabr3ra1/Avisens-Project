# ---------- Etapa 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Dependencias para compilar módulos nativos (bcrypt usa node-gyp)
RUN apk add --no-cache python3 make g++

# Instalar dependencias con la lockfile (incluye dev: necesitamos nest y prisma)
COPY package*.json ./
RUN npm ci

# Copiar el código, generar el cliente de Prisma y compilar a dist/
COPY . .
RUN npx prisma generate
RUN npm run build

# Eliminar dependencias de desarrollo (el cliente Prisma ya quedó generado)
RUN npm prune --omit=dev

# ---------- Etapa 2: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar solo lo necesario para ejecutar la app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main"]
