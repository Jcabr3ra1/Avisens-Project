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

# 4. Instalacion nueva de verdad. Todo se genera y valida en un TEMPORAL
# PRIVADO primero; nada se publica en $ENV_FILE hasta que ese temporal esta
# completo y validado. Antes esto escribia la plantilla en el .env real de
# inmediato y sustituia los secretos ahi mismo, uno por uno -- si el script
# se interrumpia (Ctrl+C) o "openssl" fallaba a mitad del bucle, quedaba un
# .env a medias: existe (asi que una proxima corrida lo veria como "ya
# existe" y lo dejaria quieto), pero con secretos reales mezclados con
# placeholders sin sustituir. Generando todo aparte primero, esa situacion
# ya no puede ocurrir: o se publica completo y valido, o $ENV_FILE nunca se
# toca.
[ -f "$ENV_EXAMPLE" ] || fail "No se encontró $ENV_EXAMPLE junto al script."

tmp_file="$(mktemp "${ENV_FILE}.XXXXXX")" || fail "No se pudo crear un archivo temporal para preparar la configuración."
chmod 600 "$tmp_file"
limpiar_temporal() { rm -f "$tmp_file"; }
trap limpiar_temporal EXIT INT TERM

generar_secreto() {
  openssl rand -base64 48 | tr -d '\n/+=' | head -c 48
}

contenido="$(cat "$ENV_EXAMPLE")"
for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN METRICS_TOKEN; do
  # Si "openssl" falla (binario roto, sin entropía, lo que sea), "set -e" +
  # "pipefail" detienen el script aqui mismo -- el trap de arriba borra el
  # temporal y $ENV_FILE sigue sin existir.
  valor="$(generar_secreto)"
  contenido="$(printf '%s\n' "$contenido" | sed "s|^${var}=.*|${var}=${valor}|")"
  unset valor
done
printf '%s\n' "$contenido" > "$tmp_file"
unset contenido

# "validar TODO" antes de publicar: cada secreto generado debe ser una
# cadena larga de verdad (coincide con el formato de generar_secreto), no
# un placeholder sin sustituir ni una cadena vacia por un fallo silencioso.
for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN METRICS_TOKEN; do
  linea="$(grep "^${var}=" "$tmp_file" || true)"
  valor_generado="${linea#${var}=}"
  if [ "${#valor_generado}" -lt 32 ]; then
    fail "La validación falló para ${var} (longitud ${#valor_generado}, se esperaban ~48) -- no se publica nada."
  fi
done

# Publicacion: la unica operacion que compite con otra ejecucion simultanea
# es ESTA, con la misma redireccion ">" bajo "set -C" de antes -- ahora
# copiando el contenido ya completo y validado del temporal, no la
# plantilla cruda.
if ! (umask 077; set -C; cat "$tmp_file" > "$ENV_FILE") 2>/dev/null; then
  fail "No se pudo publicar $ENV_FILE (¿ya existe, de una ejecución simultánea?). No se modificó nada."
fi
trap - EXIT INT TERM
rm -f "$tmp_file"

log "Secretos generados y escritos en $ENV_FILE (nunca se imprimieron)."
log "Revisa y completa a mano, si los vas a usar: ANTHROPIC_API_KEY y las variables de WhatsApp."
log ""
log "Preparación de archivos lista. Para terminar de levantar el proyecto y crear el admin:"
log "  ./scripts/dev-up.sh"
log "  docker compose exec backend pnpm run seed"
