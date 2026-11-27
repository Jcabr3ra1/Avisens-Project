#!/usr/bin/env bash
# Abre el backend a la red local (LAN) y anuncia Avisens por mDNS (_avisens._tcp)
# para que el ESP32 descubra la IP del computador automáticamente sin editar
# config.h cada vez que cambie la red o el equipo.
#
# Uso:
#   ./scripts/esp32-lan.sh                 # Abre el puerto en LAN y anuncia por mDNS
#   ./scripts/esp32-lan.sh --solo-backend  # Solo abre el puerto en LAN y termina
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

detectar_ip_lan() {
  case "$(uname -s)" in
    Darwin)
      local interfaz
      interfaz="$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}' || true)"
      if [ -n "$interfaz" ]; then
        ipconfig getifaddr "$interfaz" 2>/dev/null || true
      else
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
      fi
      ;;
    Linux)
      ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i=="src") {print $(i+1); exit}}' || true
      ;;
  esac
}

es_ip_privada() {
  local ip="$1"
  [[ "$ip" =~ ^(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})$ ]]
}

IP_LAN="${AVISENS_LAN_IP:-$(detectar_ip_lan)}"

if [ -z "$IP_LAN" ] || ! es_ip_privada "$IP_LAN"; then
  echo "ERROR: No se detectó una IPv4 privada de red local (obtenida: '${IP_LAN:-ninguna}')." >&2
  echo "Verifica que estés conectado al Wi-Fi o indica la IP manualmente:" >&2
  echo "  AVISENS_LAN_IP=192.168.1.X ./scripts/esp32-lan.sh" >&2
  exit 1
fi

echo "==> IP local del computador: $IP_LAN"
echo "==> Publicando avisens-backend en http://$IP_LAN:3000/ingest ..."

AVISENS_BACKEND_BIND="$IP_LAN" docker compose \
  -f "$REPO_ROOT/docker-compose.yml" \
  -f "$REPO_ROOT/docker-compose.override.yml" \
  up -d --no-deps backend

echo "==> Verificando salud del backend en http://$IP_LAN:3000/health ..."
for _ in $(seq 1 40); do
  if curl -fsS "http://$IP_LAN:3000/health" >/dev/null 2>&1; then
    echo "==> Backend listo y accesible desde la red Wi-Fi en http://$IP_LAN:3000/ingest"
    break
  fi
  sleep 1
done

if [ "${1:-}" = "--solo-backend" ]; then
  exit 0
fi

echo "==> Anunciando servicio mDNS '_avisens._tcp' en $IP_LAN:3000 (Ctrl+C para detener el anuncio)..."
case "$(uname -s)" in
  Darwin)
    exec dns-sd -P Avisens _avisens._tcp local 3000 avisens-backend.local "$IP_LAN" path=/ingest version=1
    ;;
  Linux)
    if command -v avahi-publish-service >/dev/null 2>&1; then
      exec avahi-publish-service Avisens _avisens._tcp 3000 "path=/ingest" "version=1"
    else
      echo "AVISO: avahi-publish-service no está instalado; el ESP32 usará el escaneo automático de subred."
    fi
    ;;
esac
