#!/usr/bin/env bash
# Prepara el .env de la raiz para desarrollo local. Un solo arranque posible:
#   - Si .env ya existe, no lo toca, bajo ninguna condicion.
#   - Si no existe pero el volumen de Postgres ya tiene datos, se detiene y
#     explica como recuperar la configuracion -- nunca genera una contraseña
#     nueva que no coincidiria con la que esa base ya tiene.
#   - Si de verdad es una instalacion nueva (ni .env ni volumen), genera los
#     secretos con openssl y los escribe directo en el archivo: nunca pasan
#     por stdout/stderr.
#
# Variables de entorno para pruebas (apuntan el script a una carpeta aislada
# en vez de a la raiz real del repo -- asi se puede probar sin tocar nunca
# el .env real ni el volumen real):
#   AVISENS_ENV_FILE, AVISENS_ENV_EXAMPLE, AVISENS_PG_VOLUME
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${AVISENS_ENV_FILE:-$REPO_ROOT/.env}"
ENV_EXAMPLE="${AVISENS_ENV_EXAMPLE:-$REPO_ROOT/.env.example}"
PG_VOLUME="${AVISENS_PG_VOLUME:-avisens-project_avisens_pg_data}"

log() { printf '%s\n' "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

# 1. Docker tiene que responder antes de decidir nada. "No pude preguntar"
# es un caso distinto de "pregunte y no existe" -- nunca se tratan igual.
if ! docker info >/dev/null 2>&1; then
  fail "No se pudo contactar a Docker (¿está Docker Desktop corriendo?). No se creó ni se modificó ningún archivo."
fi

# 2. .env existente: se conserva, sin excepcion, aunque este incompleto o
# tenga valores que ya no coincidan con el volumen.
if [ -f "$ENV_FILE" ]; then
  log "Ya existe $ENV_FILE -- no se toca. Preparación de archivos terminada."
  exit 0
fi

# 3. .env ausente: distinguir "no existe el volumen" (instalacion nueva de
# verdad) de cualquier otro error al consultarlo (se trata como inaccesible,
# igual que el paso 1 -- nunca como "ausente", para no arriesgar una
# contraseña nueva sobre una base que ya tiene otra).
set +e
volume_inspect_output=$(docker volume inspect "$PG_VOLUME" 2>&1)
volume_inspect_status=$?
set -e

if [ "$volume_inspect_status" -eq 0 ]; then
  fail "No existe $ENV_FILE, pero el volumen '$PG_VOLUME' ya tiene datos de una instalación anterior. No se genera una contraseña nueva: no coincidiría con la que esa base ya tiene. Recupera el .env original (pregunta a quien levantó el proyecto primero en esta máquina), o si de verdad quieres empezar de cero, borra ese volumen a mano con 'docker compose down -v' antes de volver a correr este script."
elif ! printf '%s' "$volume_inspect_output" | grep -qi "no such volume"; then
  fail "No se pudo consultar el volumen '$PG_VOLUME' (error distinto a 'no existe') -- no se escribe nada. Detalle: $volume_inspect_output"
fi

# 4. Instalacion nueva de verdad. Crear el .env con permisos restrictivos
# desde el primer byte y de forma atomica: "set -C" (noclobber) solo protege
# la redireccion ">" del propio shell, NO protege "cp" (cp no la consulta,
# pisaria el archivo igual aunque exista). Por eso el contenido se lee ANTES
# y se escribe en una sola redireccion ">" bajo noclobber -- esa es la unica
# operacion que el sistema garantiza exclusiva (O_EXCL) entre dos ejecuciones
# simultaneas: solo una puede crear el archivo, la otra falla aqui mismo.
[ -f "$ENV_EXAMPLE" ] || fail "No se encontró $ENV_EXAMPLE junto al script."
contenido_plantilla="$(cat "$ENV_EXAMPLE")"

if ! (umask 077; set -C; printf '%s\n' "$contenido_plantilla" > "$ENV_FILE") 2>/dev/null; then
  fail "No se pudo crear $ENV_FILE (¿ya existe, de una ejecución simultánea?). No se modificó nada."
fi
unset contenido_plantilla

generar_secreto() {
  openssl rand -base64 48 | tr -d '\n/+=' | head -c 48
}

# Los secretos se generan y se escriben directo en el archivo -- nunca por
# stdout/stderr, nunca en una variable que algun log pudiera imprimir luego.
for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN METRICS_TOKEN; do
  valor="$(generar_secreto)"
  sed -i.bak "s|^${var}=.*|${var}=${valor}|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
  unset valor
done

log "Secretos generados y escritos en $ENV_FILE (nunca se imprimieron)."
log "Revisa y completa a mano, si los vas a usar: ANTHROPIC_API_KEY y las variables de WhatsApp."
log ""
log "Preparación de archivos lista. Para terminar de levantar el proyecto y crear el admin:"
log "  ./scripts/dev-up.sh"
log "  docker compose exec backend pnpm run seed"
