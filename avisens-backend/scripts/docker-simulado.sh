#!/usr/bin/env bash
# Docker SIMULADO para las pruebas de limpieza: imita, sobre archivos en
# $DOCKER_SIM_DIR, solo los subcomandos que usa
# scripts/test-e2e-galpon-asignaciones.sh. Nunca llama al Docker real.
#
# Estado:   $DOCKER_SIM_DIR/contenedores/<id>/{nombre,etiquetas}
#           $DOCKER_SIM_DIR/volumenes/<nombre>/etiquetas
# Registro: $DOCKER_SIM_DIR/llamadas (una línea por invocación)
# Modo ($DOCKER_SIM_DIR/modo, opcional):
#   inaccesible      todas las llamadas fallan como un daemon caído
#   rm_falla         docker rm falla
#   carrera_volumen  otro proceso crea el volumen justo antes de volume create
#   carrera_contenedor  otro proceso crea el contenedor justo antes de run
set -uo pipefail

D="${DOCKER_SIM_DIR:?DOCKER_SIM_DIR no definido}"
mkdir -p "$D/contenedores" "$D/volumenes"
echo "$*" >>"$D/llamadas"
MODO="$(cat "$D/modo" 2>/dev/null || true)"

if [ "$MODO" = "inaccesible" ]; then
  echo "Cannot connect to the Docker daemon at tcp://127.0.0.1:1. Is the docker daemon running?" >&2
  exit 1
fi

nuevo_id() { od -An -N32 -tx1 /dev/urandom | tr -d ' \n'; }

buscar_contenedor() {
  local ref="$1" dir
  [ -d "$D/contenedores/$ref" ] && { echo "$ref"; return 0; }
  for dir in "$D"/contenedores/*/; do
    [ -d "$dir" ] || continue
    if [ "$(cat "$dir/nombre")" = "$ref" ] || [[ "$(basename "$dir")" == "$ref"* && ${#ref} -ge 12 ]]; then
      basename "$dir"
      return 0
    fi
  done
  return 1
}

etiqueta() {
  local archivo="$1" clave="$2"
  grep -m1 "^$clave=" "$archivo" 2>/dev/null | cut -d= -f2-
}

tiene_etiqueta() {
  grep -qxF "$2" "$1" 2>/dev/null
}

formatear() {
  local formato="$1" id="$2" archivo="$3" clave
  if [[ "$formato" == *'{{.Id}}'* ]]; then
    printf '%s' "$id"
  elif [[ "$formato" == *'{{.Name}}'* ]]; then
    printf '%s' "$id"
  fi
  if [[ "$formato" == *'Labels "'* ]]; then
    clave="${formato#*Labels \"}"
    clave="${clave%%\"*}"
    printf '|%s' "$(etiqueta "$archivo" "$clave")"
  fi
  printf '\n'
}

crear_contenedor() {
  local nombre="$1" id
  shift
  id="$(nuevo_id)"
  mkdir -p "$D/contenedores/$id"
  echo "$nombre" >"$D/contenedores/$id/nombre"
  : >"$D/contenedores/$id/etiquetas"
  for e in "$@"; do echo "$e" >>"$D/contenedores/$id/etiquetas"; done
  echo "$id"
}

crear_volumen() {
  local nombre="$1"
  shift
  mkdir -p "$D/volumenes/$nombre"
  : >"$D/volumenes/$nombre/etiquetas"
  for e in "$@"; do echo "$e" >>"$D/volumenes/$nombre/etiquetas"; done
}

case "${1:-}" in
  sim-crear-contenedor) shift; crear_contenedor "$@"; exit 0 ;;
  sim-crear-volumen) shift; crear_volumen "$@"; exit 0 ;;
  sim-borrar-contenedor)
    id="$(buscar_contenedor "$2")" && rm -rf "${D:?}/contenedores/$id"
    exit 0 ;;
  container)
    [ "${2:-}" = "inspect" ] || { echo "simulado: no soportado: $*" >&2; exit 64; }
    shift 2
    formato=""
    if [ "${1:-}" = "--format" ]; then formato="$2"; shift 2; fi
    if ! id="$(buscar_contenedor "$1")"; then
      echo "Error: No such container: $1" >&2
      exit 1
    fi
    if [ -n "$formato" ]; then formatear "$formato" "$id" "$D/contenedores/$id/etiquetas"; else echo "[{\"Id\":\"$id\"}]"; fi
    exit 0 ;;
  volume)
    sub="${2:-}"
    shift 2
    case "$sub" in
      inspect)
        formato=""
        if [ "${1:-}" = "--format" ]; then formato="$2"; shift 2; fi
        if [ ! -d "$D/volumenes/$1" ]; then
          echo "Error response from daemon: get $1: no such volume" >&2
          exit 1
        fi
        if [ -n "$formato" ]; then formatear "$formato" "$1" "$D/volumenes/$1/etiquetas"; else echo "[{\"Name\":\"$1\"}]"; fi
        exit 0 ;;
      create)
        etiquetas=()
        while [ "$#" -gt 1 ]; do
          [ "$1" = "--label" ] && { etiquetas+=("$2"); shift 2; continue; }
          shift
        done
        nombre="$1"
        if [ "$MODO" = "carrera_volumen" ] && [ ! -d "$D/volumenes/$nombre" ]; then
          crear_volumen "$nombre" "avisens.f1.token=de-otro-proceso"
        fi
        [ -d "$D/volumenes/$nombre" ] || crear_volumen "$nombre" ${etiquetas[@]+"${etiquetas[@]}"}
        echo "$nombre"
        exit 0 ;;
      rm)
        [ "${1:-}" = "-f" ] && shift
        rm -rf "${D:?}/volumenes/$1"
        exit 0 ;;
      ls)
        filtro=""
        while [ "$#" -gt 0 ]; do
          [ "$1" = "--filter" ] && { filtro="${2#label=}"; shift 2; continue; }
          shift
        done
        for dir in "$D"/volumenes/*/; do
          [ -d "$dir" ] || continue
          if [ -z "$filtro" ] || tiene_etiqueta "$dir/etiquetas" "$filtro"; then basename "$dir"; fi
        done
        exit 0 ;;
    esac
    echo "simulado: no soportado: volume $sub" >&2
    exit 64 ;;
  network)
    [ "${2:-}" = "ls" ] && exit 0
    echo "simulado: no soportado: $*" >&2
    exit 64 ;;
  run)
    shift
    nombre=""
    etiquetas=()
    while [ "$#" -gt 0 ]; do
      case "$1" in
        -d) shift ;;
        --name) nombre="$2"; shift 2 ;;
        --label) etiquetas+=("$2"); shift 2 ;;
        -e|-v|-p) shift 2 ;;
        *) shift ;;
      esac
    done
    if [ "$MODO" = "carrera_contenedor" ] && ! buscar_contenedor "$nombre" >/dev/null; then
      crear_contenedor "$nombre" "avisens.f1.token=de-otro-proceso" >/dev/null
    fi
    if buscar_contenedor "$nombre" >/dev/null; then
      echo "docker: Error response from daemon: Conflict. The container name \"/$nombre\" is already in use." >&2
      exit 125
    fi
    crear_contenedor "$nombre" ${etiquetas[@]+"${etiquetas[@]}"}
    exit 0 ;;
  rm)
    if [ "$MODO" = "rm_falla" ]; then
      echo "fallo simulado de docker rm" >&2
      exit 1
    fi
    shift
    while [ "${1:-}" = "-f" ] || [ "${1:-}" = "-v" ]; do shift; done
    if ! id="$(buscar_contenedor "$1")"; then
      echo "Error: No such container: $1" >&2
      exit 1
    fi
    rm -rf "${D:?}/contenedores/$id"
    exit 0 ;;
  ps)
    filtro=""
    shift
    while [ "$#" -gt 0 ]; do
      [ "$1" = "--filter" ] && { filtro="${2#label=}"; shift 2; continue; }
      shift
    done
    for dir in "$D"/contenedores/*/; do
      [ -d "$dir" ] || continue
      if [ -z "$filtro" ] || tiene_etiqueta "$dir/etiquetas" "$filtro"; then basename "$dir" | cut -c1-12; fi
    done
    exit 0 ;;
  exec)
    buscar_contenedor "$2" >/dev/null && exit 0
    echo "Error: No such container: $2" >&2
    exit 1 ;;
  port)
    buscar_contenedor "$2" >/dev/null && { echo "127.0.0.1:55432"; exit 0; }
    echo "Error: No such container: $2" >&2
    exit 1 ;;
esac
echo "simulado: no soportado: $*" >&2
exit 64
