#!/usr/bin/env bash
#
# Prepara el .env local para levantar Avisens con `docker compose up`.
#
# Se puede correr las veces que haga falta: nunca pisa un valor que ya
# tengas puesto. Solo rellena lo que falta o lo que siga con el texto de
# ejemplo.
#
#     ./scripts/preparar-entorno.sh
#
# Por qué existe: docker compose corta en la PRIMERA variable que falta,
# así que sin esto se descubren de una en una — arreglas POSTGRES_PASSWORD,
# vuelves a correr, y aparece ML_INTERNAL_TOKEN. Son cuatro secretos, o sea
# cuatro vueltas.
#
# Los secretos no se versionan y por eso no pueden venir en el repositorio:
# el .env.example trae marcadores, no valores. Este script los genera.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="$RAIZ/.env"
PLANTILLA="$RAIZ/.env.example"

# Los cuatro que docker-compose exige con `:?`. Si falta uno, no arranca.
OBLIGATORIOS=(POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN)

verde() { printf '\033[0;32m%s\033[0m\n' "$1"; }
gris()  { printf '\033[0;90m%s\033[0m\n' "$1"; }
rojo()  { printf '\033[0;31m%s\033[0m\n' "$1"; }

if [[ ! -f "$PLANTILLA" ]]; then
  rojo "No encuentro .env.example en $RAIZ"
  exit 1
fi

# 48 caracteres alfanuméricos. Sin '/+=' para que ningún valor tenga que ir
# entre comillas en el .env ni se rompa al interpolarlo docker compose.
generar() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 72 | tr -d '\n/+=' | head -c 48
  else
    # Sin openssl (algunos Git Bash de Windows), se usa el aleatorio del kernel.
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 48
  fi
}

# ¿El valor actual sirve, o es un marcador de la plantilla?
es_marcador() {
  local valor="$1"
  [[ -z "$valor" ]] && return 0
  case "$valor" in
    cambia-esto*|otro-distinto*|*aleatorios*) return 0 ;;
  esac
  return 1
}

valor_de() {
  local clave="$1" archivo="$2"
  [[ -f "$archivo" ]] || return 1
  # Última aparición gana, igual que hace docker compose.
  grep -E "^${clave}=" "$archivo" 2>/dev/null | tail -1 | cut -d= -f2- || true
}

if [[ ! -f "$ENV" ]]; then
  cp "$PLANTILLA" "$ENV"
  verde "Creado .env a partir de .env.example"
else
  gris "Ya existe .env: solo se completa lo que falte"
fi

# Claves de la plantilla que no están en el .env (por ejemplo, si alguien
# clonó hace meses y desde entonces se añadieron variables nuevas).
anadidas=()
while IFS= read -r clave; do
  if ! grep -qE "^${clave}=" "$ENV" 2>/dev/null; then
    linea="$(grep -E "^${clave}=" "$PLANTILLA" | tail -1)"
    printf '\n%s\n' "$linea" >> "$ENV"
    anadidas+=("$clave")
  fi
done < <(grep -oE '^[A-Z_]+=' "$PLANTILLA" | tr -d '=' | sort -u)

generadas=()
conservadas=()
for clave in "${OBLIGATORIOS[@]}"; do
  actual="$(valor_de "$clave" "$ENV" || true)"
  if es_marcador "$actual"; then
    nuevo="$(generar)"
    tmp="$(mktemp)"
    # Se reescribe entero en vez de usar `sed -i`, cuyo comportamiento
    # cambia entre macOS y Linux.
    awk -v c="$clave" -v v="$nuevo" \
      'BEGIN{FS=OFS="="} $1==c && !hecho {print c "=" v; hecho=1; next} {print}' \
      "$ENV" > "$tmp"
    mv "$tmp" "$ENV"
    generadas+=("$clave")
  else
    conservadas+=("$clave")
  fi
done

echo
[[ ${#anadidas[@]}    -gt 0 ]] && verde "Variables nuevas añadidas: ${anadidas[*]}"
[[ ${#generadas[@]}   -gt 0 ]] && verde "Secretos generados:        ${generadas[*]}"
[[ ${#conservadas[@]} -gt 0 ]] && gris  "Ya los tenías, no se tocan: ${conservadas[*]}"

# JWT_SECRET y JWT_REFRESH_SECRET iguales significaría que un token de
# refresco vale como token de acceso. Se corrige en vez de solo avisar: si
# el script se limita a fallar, volver a correrlo deja el mismo problema.
if [[ "$(valor_de JWT_SECRET "$ENV")" == "$(valor_de JWT_REFRESH_SECRET "$ENV")" ]]; then
  nuevo="$(generar)"
  tmp="$(mktemp)"
  awk -v v="$nuevo" \
    'BEGIN{FS=OFS="="} $1=="JWT_REFRESH_SECRET" && !hecho {print "JWT_REFRESH_SECRET=" v; hecho=1; next} {print}' \
    "$ENV" > "$tmp"
  mv "$tmp" "$ENV"
  rojo "JWT_SECRET y JWT_REFRESH_SECRET eran iguales: se regeneró el de refresco."
fi

echo
verde "Listo. Ahora:  docker compose up -d --build"
gris  "El .env está en .gitignore: no se sube."
