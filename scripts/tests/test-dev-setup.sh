#!/usr/bin/env bash
# Prueba automatizada y versionada de scripts/dev-setup.sh. Ejercita el
# script REAL (no una reimplementacion) contra una carpeta aislada, propia
# de esta corrida -- nunca toca el .env real, el volumen real, ni Docker
# real (salvo el caso de "Docker inaccesible", que apunta a un socket que
# no existe en vez de al Docker real). Cada escenario crea su propia
# carpeta temporal y la borra al terminar.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/dev-setup.sh"
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

fallos=0
ok() { echo "OK: $*"; }
mal() { echo "FALLO: $*" >&2; fallos=$((fallos + 1)); }

plantilla() {
  cat > "$1" <<'EOF'
POSTGRES_PASSWORD=cambia-esto
JWT_SECRET=cambia-esto
JWT_REFRESH_SECRET=cambia-esto
ML_INTERNAL_TOKEN=cambia-esto
METRICS_TOKEN=cambia-esto
ADMIN_EMAIL=admin@avisens.com
ADMIN_PASSWORD=cambia-esto
EOF
}

echo "=== 1) Instalación nueva de verdad: genera .env con los 5 secretos sustituidos ==="
d1="$TRABAJO/1-instalacion-nueva"; mkdir -p "$d1"
plantilla "$d1/.env.example"
if AVISENS_ENV_FILE="$d1/.env" AVISENS_ENV_EXAMPLE="$d1/.env.example" \
   AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-1" "$SCRIPT" >"$d1/log" 2>&1; then
  if [ -f "$d1/.env" ]; then
    sin_sustituir=0
    for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN METRICS_TOKEN; do
      valor="$(grep "^${var}=" "$d1/.env" | cut -d= -f2-)"
      [ "${#valor}" -ge 32 ] || sin_sustituir=1
    done
    permisos="$(stat -f '%Lp' "$d1/.env" 2>/dev/null || stat -c '%a' "$d1/.env")"
    if [ "$sin_sustituir" -eq 0 ] && [ "$permisos" = "600" ]; then
      ok "instalación nueva: .env creado con los 5 secretos (>=32 chars) y permisos 600"
    else
      mal "instalación nueva: secretos sin sustituir o permisos != 600 (permisos=$permisos)"
    fi
  else
    mal "instalación nueva: el script terminó bien pero no creó .env"
  fi
else
  mal "instalación nueva: el script falló (ver $d1/log)"
  cat "$d1/log" >&2
fi

echo "=== 2) .env existente: nunca se toca ==="
d2="$TRABAJO/2-env-existente"; mkdir -p "$d2"
plantilla "$d2/.env.example"
printf 'YA_EXISTIA=si\n' > "$d2/.env"
hash_antes="$(shasum "$d2/.env")"
AVISENS_ENV_FILE="$d2/.env" AVISENS_ENV_EXAMPLE="$d2/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-2" "$SCRIPT" >"$d2/log" 2>&1
hash_despues="$(shasum "$d2/.env")"
if [ "$hash_antes" = "$hash_despues" ]; then
  ok ".env existente: contenido intacto, byte a byte"
else
  mal ".env existente: el contenido cambió -- esto nunca debe pasar"
fi

echo "=== 3) Segunda ejecución sobre una instalación ya hecha: no-op, sin cambios ==="
d3="$TRABAJO/3-segunda-corrida"; mkdir -p "$d3"
plantilla "$d3/.env.example"
AVISENS_ENV_FILE="$d3/.env" AVISENS_ENV_EXAMPLE="$d3/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-3" "$SCRIPT" >"$d3/log1" 2>&1
hash_1="$(shasum "$d3/.env")"
AVISENS_ENV_FILE="$d3/.env" AVISENS_ENV_EXAMPLE="$d3/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-3" "$SCRIPT" >"$d3/log2" 2>&1
hash_2="$(shasum "$d3/.env")"
if [ "$hash_1" = "$hash_2" ] && grep -q "no se toca" "$d3/log2"; then
  ok "segunda ejecución: no modifica el .env ya generado y lo dice explícitamente"
else
  mal "segunda ejecución: algo cambió o no avisó que no tocaría nada"
fi

echo "=== 4) Volumen poblado sin .env: se detiene, no genera contraseña nueva ==="
d4="$TRABAJO/4-volumen-poblado"; mkdir -p "$d4"
plantilla "$d4/.env.example"
vol4="avisens-test-vol-poblado-$$"
docker volume create "$vol4" >/dev/null
if AVISENS_ENV_FILE="$d4/.env" AVISENS_ENV_EXAMPLE="$d4/.env.example" \
   AVISENS_PG_VOLUME="$vol4" "$SCRIPT" >"$d4/log" 2>&1; then
  mal "volumen poblado: debía fallar y no lo hizo"
else
  if [ ! -f "$d4/.env" ] && grep -qi "no se genera una contraseña nueva" "$d4/log"; then
    ok "volumen poblado sin .env: se detiene con el mensaje correcto, no crea .env"
  else
    mal "volumen poblado: falló pero sin el mensaje esperado, o dejó un .env"
  fi
fi
docker volume rm "$vol4" >/dev/null

echo "=== 5) Docker inaccesible: se distingue de 'volumen ausente' ==="
d5="$TRABAJO/5-docker-inaccesible"; mkdir -p "$d5"
plantilla "$d5/.env.example"
if DOCKER_HOST="unix://$TRABAJO/socket-que-no-existe.sock" \
   AVISENS_ENV_FILE="$d5/.env" AVISENS_ENV_EXAMPLE="$d5/.env.example" \
   AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-5" "$SCRIPT" >"$d5/log" 2>&1; then
  mal "Docker inaccesible: debía fallar y no lo hizo"
else
  if [ ! -f "$d5/.env" ] && grep -qi "no se pudo contactar a Docker" "$d5/log"; then
    ok "Docker inaccesible: se detiene con el mensaje correcto, no crea .env"
  else
    mal "Docker inaccesible: falló pero con mensaje distinto al esperado"
    cat "$d5/log" >&2
  fi
fi

echo "=== 6) Fallo de openssl a mitad de la generación: no deja .env parcial ==="
d6="$TRABAJO/6-openssl-falla"; mkdir -p "$d6/fakebin"
plantilla "$d6/.env.example"
cat > "$d6/fakebin/openssl" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$d6/fakebin/openssl"
if PATH="$d6/fakebin:$PATH" AVISENS_ENV_FILE="$d6/.env" AVISENS_ENV_EXAMPLE="$d6/.env.example" \
   AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-6" "$SCRIPT" >"$d6/log" 2>&1; then
  mal "openssl falla: el script debía fallar y no lo hizo"
else
  sobras="$(find "$d6" -maxdepth 1 -name '.env.*' ! -name '.env.example' 2>/dev/null)"
  if [ ! -f "$d6/.env" ] && [ -z "$sobras" ]; then
    ok "openssl falla: no se publicó .env y no quedó temporal huérfano"
  else
    mal "openssl falla: quedó .env o un temporal sin limpiar (sobras: $sobras)"
  fi
fi

echo "=== 7) Interrupción fatal (SIGKILL) a mitad de la generación: nunca deja .env parcial ==="
d7="$TRABAJO/7-sigkill"; mkdir -p "$d7/fakebin"
plantilla "$d7/.env.example"
cat > "$d7/fakebin/openssl" <<EOF
#!/usr/bin/env bash
sleep 3
exec /usr/bin/openssl "\$@"
EOF
chmod +x "$d7/fakebin/openssl"
PATH="$d7/fakebin:$PATH" AVISENS_ENV_FILE="$d7/.env" AVISENS_ENV_EXAMPLE="$d7/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-7" "$SCRIPT" >"$d7/log" 2>&1 &
pid7=$!
sleep 1.2
kill -9 "$pid7" 2>/dev/null || true
wait "$pid7" 2>/dev/null || true
if [ -f "$d7/.env" ]; then
  mal "SIGKILL a mitad de la generación: quedó un .env (riesgo de archivo parcial)"
else
  ok "SIGKILL a mitad de la generación: .env nunca se publicó (ni parcial ni completo)"
fi
# Una corrida normal después de la interrupción debe seguir funcionando.
find "$d7" -maxdepth 1 -name '.env.*' ! -name '.env.example' -delete 2>/dev/null || true
if AVISENS_ENV_FILE="$d7/.env" AVISENS_ENV_EXAMPLE="$d7/.env.example" \
   AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-7b" "$SCRIPT" >"$d7/log2" 2>&1 && [ -f "$d7/.env" ]; then
  ok "después de la interrupción, una corrida normal sigue funcionando"
else
  mal "después de la interrupción, una corrida normal ya no funciona"
fi

echo "=== 8) Concurrencia: dos ejecuciones simultáneas sobre la misma instalación nueva ==="
d8="$TRABAJO/8-concurrencia"; mkdir -p "$d8"
plantilla "$d8/.env.example"
AVISENS_ENV_FILE="$d8/.env" AVISENS_ENV_EXAMPLE="$d8/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-8a" "$SCRIPT" >"$d8/logA" 2>&1 &
pidA=$!
AVISENS_ENV_FILE="$d8/.env" AVISENS_ENV_EXAMPLE="$d8/.env.example" \
  AVISENS_PG_VOLUME="avisens-test-vol-no-existe-$$-8b" "$SCRIPT" >"$d8/logB" 2>&1 &
pidB=$!
codigoA=0; codigoB=0
wait "$pidA" || codigoA=$?
wait "$pidB" || codigoB=$?
ganadores=0
[ "$codigoA" -eq 0 ] && ganadores=$((ganadores + 1))
[ "$codigoB" -eq 0 ] && ganadores=$((ganadores + 1))
sin_sustituir8=0
if [ -f "$d8/.env" ]; then
  for var in POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET ML_INTERNAL_TOKEN METRICS_TOKEN; do
    valor="$(grep "^${var}=" "$d8/.env" | cut -d= -f2-)"
    [ "${#valor}" -ge 32 ] || sin_sustituir8=1
  done
fi
if [ "$ganadores" -eq 1 ] && [ -f "$d8/.env" ] && [ "$sin_sustituir8" -eq 0 ]; then
  ok "concurrencia: exactamente una corrida ganó, el .env final está completo y válido"
else
  mal "concurrencia: ganadores=$ganadores, sustitución incompleta=$sin_sustituir8 (ver $d8/logA y $d8/logB)"
fi

echo ""
if [ "$fallos" -eq 0 ]; then
  echo "RESULTADO: todos los escenarios de dev-setup.sh pasaron."
  exit 0
else
  echo "RESULTADO: $fallos escenario(s) fallaron." >&2
  exit 1
fi
