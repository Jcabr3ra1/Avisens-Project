#!/usr/bin/env bash
# Instalacion limpia del stack COMPLETO (frontend, backend, Postgres, Redis,
# ML) en un entorno desechable con recursos propios -- nunca toca
# avisens-project. Verifica que los 5 servicios queden healthy y que, tras
# el seed explicito, se pueda iniciar sesion con las credenciales
# documentadas. NO verifica logica de negocio de cada servicio (p. ej. que
# el ML prediga algo con sentido, o que el frontend renderice la UI) -- solo
# que cada uno responde como "healthy" y que el login funciona.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/scripts/docker-compose.instalacion-limpia-test.yml"
PROYECTO="avisens-instalacion-limpia-test-$(date +%s)-$$"
SERVICIOS=(database redis backend ml frontend)
TIMEOUT_SALUD="${AVISENS_TEST_TIMEOUT:-180}"

compose() { docker compose -f "$COMPOSE_FILE" -p "$PROYECTO" "$@"; }

# Limpieza endurecida: revisa contenedores, volumenes Y redes (no solo
# contenedores); funciona igual si "up" nunca llego a crear nada; nunca
# oculta un fallo real de "down" como si fuera exito; y termina de verdad
# (exit explicito) ante INT/TERM en vez de dejar que el script siga
# corriendo despues del trap.
limpiar() {
  local fallo=0
  local contenedores volumenes redes id etiqueta

  contenedores="$(compose ps -aq 2>/dev/null || true)"
  volumenes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  redes="$(docker network ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"

  for id in $contenedores; do
    etiqueta="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null || true)"
    if [ "$etiqueta" != "$PROYECTO" ]; then
      echo "ERROR: el contenedor $id no lleva la etiqueta de este proyecto ($PROYECTO) -- no se limpia nada, revisa a mano." >&2
      return 1
    fi
  done

  if [ -z "$contenedores" ] && [ -z "$volumenes" ] && [ -z "$redes" ]; then
    echo "Nada que limpiar: no hay contenedores, volúmenes ni redes de $PROYECTO." >&2
    return 0
  fi

  # --rmi local: borra tambien las imagenes que esta corrida construyo (su
  # tag incluye el nombre de proyecto unico, nunca se reutilizan entre
  # corridas) -- sin esto, cada ejecucion deja 4 imagenes huerfanas. No
  # toca redis:7-alpine (viene de "image:", no de un build local) ni la
  # imagen base postgres:16-alpine de la que sale la propia.
  if ! compose down -v --rmi local --remove-orphans; then
    echo "ERROR: 'docker compose down' terminó con error limpiando $PROYECTO -- puede haber quedado algo a medias, revisa a mano." >&2
    fallo=1
  fi

  volumenes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  redes="$(docker network ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  if [ -n "$volumenes" ] || [ -n "$redes" ]; then
    echo "ERROR: quedaron recursos de $PROYECTO sin limpiar (volúmenes: ${volumenes:-ninguno} / redes: ${redes:-ninguna}) -- revisa a mano." >&2
    fallo=1
  fi

  return "$fallo"
}

manejar_salida() {
  local codigo_previo=$?
  limpiar
  local codigo_limpieza=$?
  if [ "$codigo_previo" -eq 0 ] && [ "$codigo_limpieza" -ne 0 ]; then
    exit 1
  fi
  exit "$codigo_previo"
}

manejar_senal() {
  trap - EXIT INT TERM
  limpiar || true
  exit "$1"
}

trap manejar_salida EXIT
trap 'manejar_senal 130' INT
trap 'manejar_senal 143' TERM

echo "Proyecto desechable: $PROYECTO"
echo "1) Construyendo e iniciando el stack completo..."
compose up -d --build

echo "2) Esperando a que los 5 servicios estén healthy (máximo ${TIMEOUT_SALUD}s)..."
inicio=$(date +%s)
while true; do
  pendientes=()
  for s in "${SERVICIOS[@]}"; do
    cid="$(compose ps -q "$s" 2>/dev/null || true)"
    if [ -z "$cid" ]; then
      pendientes+=("$s=sin_contenedor")
      continue
    fi
    estado="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sin_healthcheck:{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo desconocido)"
    [ "$estado" = "healthy" ] || pendientes+=("$s=$estado")
  done
  if [ ${#pendientes[@]} -eq 0 ]; then
    echo "   Los 5 servicios están healthy: ${SERVICIOS[*]}"
    break
  fi
  if [ $(( $(date +%s) - inicio )) -ge "$TIMEOUT_SALUD" ]; then
    echo "ERROR: se agotó el tiempo (${TIMEOUT_SALUD}s) esperando: ${pendientes[*]}" >&2
    compose logs --tail 40 >&2 || true
    exit 1
  fi
  sleep 3
done

echo "3) Sembrando roles y admin (seed explícito, igual que en la preparación inicial real)..."
compose exec -T backend pnpm run seed

echo "4) Verificando que el login funcione con admin@avisens.com / Avisens2026!..."
resultado=$(compose exec -T backend node -e "
const http = require('http');
const datos = JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
const req = http.request({ hostname: '127.0.0.1', port: 3000, path: '/v1/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } }, res => {
  let cuerpo = '';
  res.on('data', c => cuerpo += c);
  res.on('end', () => {
    let tieneToken = false;
    try { tieneToken = typeof JSON.parse(cuerpo).access_token === 'string'; } catch (e) {}
    console.log((res.statusCode === 200 || res.statusCode === 201) && tieneToken ? 'LOGIN_OK' : 'LOGIN_FALLO:' + res.statusCode);
  });
});
req.on('error', e => console.log('LOGIN_FALLO:' + e.message));
req.write(datos);
req.end();
")

if [ "$(printf '%s' "$resultado" | tr -d '[:space:]')" = "LOGIN_OK" ]; then
  echo "   OK: login exitoso, el token de acceso llegó."
else
  echo "ERROR: el login no funcionó ($resultado)" >&2
  exit 1
fi

echo ""
echo "RESULTADO: los 5 servicios (frontend, backend, Postgres, Redis, ML) arrancaron healthy desde cero, y el seed explícito dejó el login funcionando con las credenciales documentadas."
echo "Esto NO verifica la lógica interna de cada servicio (predicciones del ML, UI del frontend, colas de Redis) -- solo que arrancan sanos y que el camino de autenticación funciona de punta a punta."
