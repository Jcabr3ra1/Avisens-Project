# ---------- Etapa 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Habilitar pnpm (viene incluido con Node via corepack).
RUN corepack enable

# Dependencias para compilar modulos nativos (bcrypt usa node-gyp).
RUN apk add --no-cache python3 make g++

# Instalar dependencias con la lockfile (incluye dev: necesitamos nest y prisma).
# El postinstall genera el cliente Prisma, que necesita el schema y una
# DATABASE_URL de relleno (prisma generate NO se conecta a la base).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm install --frozen-lockfile

# Copiar el resto del codigo y compilar a dist/.
COPY . .
RUN pnpm run build

# ---------- Etapa dev: hot-reload (nest --watch) ----------
# Conserva las dev-deps (nest CLI) y el codigo fuente. Solo se usa en local via
# docker-compose.override.yml; produccion NO usa esta etapa.
FROM builder AS dev
CMD ["pnpm", "run", "start:dev"]

# ---------- Etapa prune: dependencias de produccion ----------
# --ignore-scripts evita re-ejecutar el postinstall (prisma generate), que ya
# corrio en el install; el cliente Prisma ya quedo generado.
FROM builder AS pruned
RUN pnpm prune --prod --ignore-scripts

# ---------- Etapa 2: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar solo lo necesario para ejecutar la app.
# prisma/ y prisma.config.ts se necesitan para correr `migrate deploy` al arrancar.
COPY --from=pruned /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

# Script de arranque: aplica migraciones y luego lanza la app.
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
