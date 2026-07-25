// AlertasPage.tsx — Módulo de Alertas (EP-05 HU-22 a HU-25).
// Roles según las épicas:
//   HU-22: Operario/Propietario reciben alertas activas
//   HU-24: Operario cierra alertas con comentario y evidencia fotográfica
//   HU-23: Escalamiento — disponible para ambos roles
//   HU-25: Configurar canales — pendiente (requiere backend)

import { useEffect, useRef, useState } from 'react'
import { ALERTAS_MOCK, type Alerta, type EstadoAlerta } from './data'
import { GALPONES_MONITOREO } from '../monitoreo/data'
import { IcCheck, IcPaperclip, IcAlert, IcClock, IcUserCircle } from '@shared/ui/icons/icons'
import { useLecturasVivas } from '@shared/hooks/useLecturasVivas'
import { calcularEstadoSensor, formatearFechaHora, idAlertaSensor } from '@shared/utils/sensores'
import { marcarAlertasVistas } from '@shared/utils/alertasVistas'
import './AlertasPage.css'

// ─── Motor de alertas: se calculan para TODOS los galpones ────────────────────
// Las alertas activas ya no viven escritas a mano en un archivo aparte — se
// calculan directamente a partir de los mismos sensores que muestra
// Monitoreo (GALPONES_MONITOREO), para GP-01, GP-02, GP-03 y GP-04 por igual.
// Para GP-01, que ya tiene un ESP32 real conectado, se usa el valor en vivo
// de Firebase cuando existe; para los demás galpones (todavía sin hardware),
// se usa su propio valor de ejemplo (mock) — el mismo que ya ve Monitoreo.
// Así, Alertas nunca puede desincronizarse de lo que muestra Monitoreo,
// porque literalmente lee la misma fuente.
//
// Reglas del motor, iguales para cualquier galpón:
//   - Si un sensor sale de rango (advertencia o crítico) → aparece la alerta.
//   - Mientras siga fuera de rango y nadie la haya tocado → se actualiza sola.
//   - Si vuelve a rango → desaparece sola.
//   - Si el usuario ya la cerró o escaló → se respeta esa decisión, no se
//     vuelve a tocar ni a regenerar mientras siga fuera de rango.

// Alerta especial: no es "un valor fuera de rango", es "dejamos de recibir
// datos del sensor real". Solo aplica a GP-01, el único con ESP32 conectado.
// El ESP32 escribe cada ~60s (ver esp32-sensores/), así que si pasan más de
// 3 ciclos sin novedad, ya no es una demora normal — algo se apagó, perdió
// WiFi, o se colgó.
const ID_ALERTA_DESCONEXION = 104
const UMBRAL_DESCONEXION_MS = 3 * 60 * 1000
const CODIGO_GALPON_CON_ESP32 = 'GP-01'

// ─── Tipos del modal de cierre ────────────────────────────────────────────────

// Estado del formulario de cierre de alerta (HU-24)
type FormCierre = {
  comentario: string
  fotoNombre: string | null  // Nombre del archivo de foto adjuntado
}

// ─── Componente principal ─────────────────────────────────────────────────────
function AlertasPage() {
  // Lista de alertas en estado local — permite simular cierre/escalamiento
  const [alertas, setAlertas] = useState<Alerta[]>(ALERTAS_MOCK)

  // Lecturas reales de GP-01 (temperatura, humedad y, si ya está conectado
  // el MQ-135 dedicado, CO2). Mientras el ESP32 esté apagado, esto sigue
  // trayendo el último valor que Firebase alguna vez recibió — no un dato
  // falso, es lo mismo que ve Monitoreo. El resto de los galpones no tiene
  // sensor real todavía, así que no hace falta escuchar nada para ellos: se
  // usa directamente su valor de ejemplo (mock), igual que hace Monitoreo.
  const lecturasVivasGP01 = useLecturasVivas(CODIGO_GALPON_CON_ESP32)

  // A qué hora (reloj del navegador) se detectó por primera vez cada alerta
  // viva, para poder calcular "minutosActiva" sin tener que guardarlo a mano.
  const inicioAlertaViva = useRef<Record<number, number>>({})

  // Mantiene sincronizadas las alertas de TODOS los galpones con sus
  // sensores: agrega una alerta nueva si un valor sale de rango (o si el
  // sensor real deja de responder), la actualiza mientras siga activa, y la
  // retira si el valor vuelve a rango — pero nunca toca una que el usuario
  // ya cerró o escaló manualmente.
  useEffect(() => {
    function sincronizar() {
      setAlertas(prev => {
        let siguiente = prev

        for (const galpon of GALPONES_MONITOREO) {
          const nombreGalpon = `${galpon.nombre} (${galpon.codigo})`
          const esGalponConEsp32 = galpon.codigo === CODIGO_GALPON_CON_ESP32

          for (const sensor of galpon.sensores) {
            if (sensor.estado === 'offline') continue // galpón vacío, sin lote activo

            const idAlerta = idAlertaSensor(galpon.id, sensor.variable)

            // GP-01: se prefiere el valor real (Firebase) si ya llegó alguno
            // para esta variable; si no, se usa su propio mock, igual que
            // hace Monitoreo. El resto de los galpones siempre usa su mock.
            const vivo = esGalponConEsp32 ? lecturasVivasGP01[sensor.variable] : undefined
            const valor = vivo ? Math.round(vivo.valor * 10) / 10 : sensor.valor
            const ts    = vivo ? vivo.ts : Date.now()

            const estado    = calcularEstadoSensor(valor, sensor.minUmbral, sensor.maxUmbral)
            const existente  = siguiente.find(a => a.id === idAlerta)

            if (estado === 'optimo') {
              // Volvió a rango: si la alerta seguía "activa" (nadie la tocó), se retira sola.
              if (existente && existente.estado === 'activa') {
                siguiente = siguiente.filter(a => a.id !== idAlerta)
                delete inicioAlertaViva.current[idAlerta]
              }
              continue
            }

            if (!existente) {
              inicioAlertaViva.current[idAlerta] = ts
              siguiente = [
                ...siguiente,
                {
                  id: idAlerta,
                  galpon: nombreGalpon,
                  zona: sensor.zona,
                  variable: sensor.etiqueta,
                  valorActual: valor,
                  unidad: sensor.unidad,
                  rangoMin: sensor.minUmbral,
                  rangoMax: sensor.maxUmbral,
                  severidad: estado === 'critico' ? 'critica' : 'advertencia',
                  estado: 'activa',
                  fechaHora: formatearFechaHora(ts),
                  minutosActiva: 0,
                },
              ]
            } else if (existente.estado === 'activa') {
              // Solo se refresca mientras siga activa — si ya se cerró/escaló, se respeta esa decisión.
              const inicio = inicioAlertaViva.current[idAlerta] ?? ts
              const minutosActiva = Math.floor((Date.now() - inicio) / 60000)
              siguiente = siguiente.map(a =>
                a.id === idAlerta
                  ? { ...a, valorActual: valor, severidad: estado === 'critico' ? 'critica' : 'advertencia', minutosActiva }
                  : a,
              )
            }
          }
        }

        // ── Alerta de conexión: ¿cuánto hace que no llega NINGÚN dato nuevo de GP-01? ──
        // Todas las variables de un mismo lote de lectura comparten el mismo
        // `ts` (ver useLecturasVivas), así que basta con mirar cualquiera.
        // Solo aplica a GP-01: es el único galpón con un sensor real que
        // pueda "dejar de responder" — los demás son mock y siempre "responden".
        const tsUltimaLectura =
          lecturasVivasGP01.temperatura?.ts ??
          lecturasVivasGP01.humedad?.ts ??
          lecturasVivasGP01.co2?.ts

        const existenteDesconexion = siguiente.find(a => a.id === ID_ALERTA_DESCONEXION)
        const minutosSinDatos = tsUltimaLectura ? Math.floor((Date.now() - tsUltimaLectura) / 60000) : 0
        const desconectado = !!tsUltimaLectura && Date.now() - tsUltimaLectura > UMBRAL_DESCONEXION_MS

        if (desconectado) {
          if (!existenteDesconexion) {
            siguiente = [
              ...siguiente,
              {
                id: ID_ALERTA_DESCONEXION,
                galpon: 'Galpón Norte (GP-01)',
                zona: 'Todo el galpón',
                variable: 'Conexión del sensor',
                valorActual: minutosSinDatos,
                unidad: 'min sin datos',
                rangoMin: 0,
                rangoMax: Math.round(UMBRAL_DESCONEXION_MS / 60000),
                severidad: 'critica',
                estado: 'activa',
                fechaHora: formatearFechaHora(tsUltimaLectura!),
                minutosActiva: minutosSinDatos,
              },
            ]
          } else if (existenteDesconexion.estado === 'activa') {
            siguiente = siguiente.map(a =>
              a.id === ID_ALERTA_DESCONEXION
                ? { ...a, valorActual: minutosSinDatos, minutosActiva: minutosSinDatos }
                : a,
            )
          }
        } else if (existenteDesconexion && existenteDesconexion.estado === 'activa') {
          // Volvió a haber datos frescos: la alerta de conexión se retira sola.
          siguiente = siguiente.filter(a => a.id !== ID_ALERTA_DESCONEXION)
        }

        return siguiente
      })
    }

    sincronizar()
    // El chequeo de "cuánto hace que no llega nada" no se puede disparar solo
    // con el efecto de Firebase — si el sensor está apagado, Firebase nunca
    // vuelve a avisar. Por eso también se revisa cada 30s por reloj.
    const intervalo = setInterval(sincronizar, 30_000)
    return () => clearInterval(intervalo)
  }, [lecturasVivasGP01])

  // Pestaña activa: 'activas' o 'historial'
  const [tab, setTab] = useState<'activas' | 'historial'>('activas')

  // ID de la alerta que se está cerrando (null = modal cerrado)
  const [cierreId, setCierreId] = useState<number | null>(null)

  // Formulario de cierre — comentario + foto adjunta (HU-24)
  const [formCierre, setFormCierre] = useState<FormCierre>({ comentario: '', fotoNombre: null })
  const [errorCierre, setErrorCierre] = useState('')

  // Referencia al input de archivo para abrir el selector desde el botón
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Alertas filtradas según la pestaña
  const activas   = alertas.filter(a => a.estado === 'activa' || a.estado === 'escalada')
  const historial = alertas.filter(a => a.estado === 'cerrada')
  const lista     = tab === 'activas' ? activas : historial

  // Con solo entrar a esta página y ver la lista de activas, quedan marcadas
  // como "vistas" — así el avatar AVIA (en Mi galpón) deja de avisar sobre
  // ellas. Si aparece una alerta nueva mientras la página sigue abierta
  // (llega una lectura fuera de rango), este mismo efecto la marca también.
  useEffect(() => {
    marcarAlertasVistas(activas.map(a => a.id))
  }, [activas])

  // ── Abre el modal de cierre para una alerta ─────────────────────────────────
  function abrirCierre(id: number) {
    setFormCierre({ comentario: '', fotoNombre: null })
    setErrorCierre('')
    setCierreId(id)
  }

  // ── Confirma el cierre de la alerta (HU-24) ─────────────────────────────────
  // El cierre requiere comentario Y al menos una fotografía adjunta
  function confirmarCierre() {
    if (!formCierre.comentario.trim()) {
      setErrorCierre('El comentario es obligatorio para cerrar la alerta.')
      return
    }
    if (!formCierre.fotoNombre) {
      setErrorCierre('Debes adjuntar al menos una fotografía como evidencia.')
      return
    }

    setAlertas(prev =>
      prev.map(a =>
        a.id === cierreId
          ? { ...a, estado: 'cerrada' as EstadoAlerta, accionCierre: formCierre.comentario }
          : a,
      ),
    )
    setCierreId(null)
  }

  // ── Escala una alerta al siguiente nivel jerárquico (HU-23) ──────────────────
  function escalarAlerta(id: number) {
    setAlertas(prev =>
      prev.map(a =>
        a.id === id ? { ...a, estado: 'escalada' as EstadoAlerta } : a,
      ),
    )
  }

  // ── Captura el archivo de foto seleccionado ──────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    setFormCierre(prev => ({ ...prev, fotoNombre: archivo?.name ?? null }))
  }

  return (
    <div className="page-container ale-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="ale-header">
        <div>
          <h1 className="ale-title">Alertas del sistema</h1>
          <p className="ale-sub">Notificaciones automáticas por parámetros fuera de rango</p>
        </div>

        {/* Contadores de severidad */}
        <div className="ale-contadores">
          <span className="ale-contador ale-contador--critico">
            <span className="ale-dot ale-dot--critica" /> {activas.filter(a => a.severidad === 'critica').length} críticas
          </span>
          <span className="ale-contador ale-contador--advertencia">
            <span className="ale-dot ale-dot--advertencia" /> {activas.filter(a => a.severidad === 'advertencia').length} advertencias
          </span>
        </div>
      </header>

      {/* ── Pestañas ────────────────────────────────────────────────────────── */}
      <div className="ale-tabs">
        <button
          className={`ale-tab${tab === 'activas' ? ' ale-tab--activo' : ''}`}
          onClick={() => setTab('activas')}
        >
          Activas
          {activas.length > 0 && <span className="ale-tab-badge">{activas.length}</span>}
        </button>
        <button
          className={`ale-tab${tab === 'historial' ? ' ale-tab--activo' : ''}`}
          onClick={() => setTab('historial')}
        >
          Historial ({historial.length})
        </button>
      </div>

      {/* ── Lista de alertas ────────────────────────────────────────────────── */}
      {lista.length === 0
        ? (
          <div className="ale-vacio">
            <IcCheck size={32} />
            <p>{tab === 'activas' ? 'No hay alertas activas. Todo en orden.' : 'Sin alertas en el historial.'}</p>
          </div>
        )
        : (
          <div className="ale-lista">
            {lista.map(a => (
              <FilaAlerta
                key={a.id}
                alerta={a}
                onCerrar={() => abrirCierre(a.id)}
                onEscalar={() => escalarAlerta(a.id)}
              />
            ))}
          </div>
        )
      }

      {/* ── Modal de cierre de alerta (HU-24) ───────────────────────────────── */}
      {/* El criterio exige comentario + foto; sin alguno de los dos no se puede cerrar */}
      {cierreId !== null && (
        <div className="ale-modal-overlay" onClick={() => setCierreId(null)}>
          <div className="ale-modal-card" onClick={e => e.stopPropagation()}>

            <h2 className="ale-modal-titulo">Cerrar alerta</h2>
            <p className="ale-modal-desc">
              Describe la acción correctiva aplicada y adjunta una fotografía como evidencia.
              Ambos campos son obligatorios (EP-05 HU-24).
            </p>

            {/* Campo de comentario — obligatorio */}
            <label className="ale-modal-label">
              <span>Acción correctiva <em>(obligatorio)</em></span>
              <textarea
                className="ale-modal-textarea"
                rows={3}
                placeholder="Ej: Se abrieron las cortinas y se encendió el extractor norte…"
                value={formCierre.comentario}
                onChange={e => setFormCierre(prev => ({ ...prev, comentario: e.target.value }))}
              />
            </label>

            {/* Adjuntar foto — obligatorio (HU-24) */}
            <label className="ale-modal-label">
              <span>Fotografía de evidencia <em>(obligatorio)</em></span>
              <div className="ale-foto-area" onClick={() => inputFotoRef.current?.click()}>
                {formCierre.fotoNombre
                  ? <span className="ale-foto-nombre"><IcPaperclip size={14} /> {formCierre.fotoNombre}</span>
                  : <span className="ale-foto-placeholder"><IcPaperclip size={14} /> Toca aquí para adjuntar una foto</span>
                }
              </div>
              {/* Input oculto — se activa desde ale-foto-area */}
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="ale-foto-input"
                onChange={handleFoto}
              />
            </label>

            {/* Mensaje de error si falta algún campo */}
            {errorCierre && <p className="ale-modal-error" role="alert">{errorCierre}</p>}

            {/* Acciones del modal */}
            <div className="ale-modal-acciones">
              <button className="ale-btn-cancelar" onClick={() => setCierreId(null)}>
                Cancelar
              </button>
              <button className="ale-btn-confirmar" onClick={confirmarCierre}>
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: fila de una alerta ───────────────────────────────────────
type FilaAlertaProps = {
  alerta: Alerta
  onCerrar: () => void
  onEscalar: () => void
}
function FilaAlerta({ alerta, onCerrar, onEscalar }: FilaAlertaProps) {
  // Desviación porcentual del valor respecto al umbral superado — puede ser
  // por encima del máximo o por debajo del mínimo, cada caso con su propio texto.
  // Variables como NH₃ o CO₂ no tienen un mínimo real (su rangoMin es 0, es
  // solo un valor de relleno) — para esas, "bajo el mínimo" no tiene sentido
  // y no se debe calcular (dividir entre 0 daba "-Infinity%").
  const sobrePasaMax = alerta.valorActual > alerta.rangoMax
  const hayMinimoReal = alerta.rangoMin > 0
  const desviacionValida = sobrePasaMax || hayMinimoReal
  const desviacion = sobrePasaMax
    ? (((alerta.valorActual - alerta.rangoMax) / alerta.rangoMax) * 100).toFixed(1)
    : hayMinimoReal
      ? (((alerta.rangoMin - alerta.valorActual) / alerta.rangoMin) * 100).toFixed(1)
      : null

  const etiquetaEstado: Record<EstadoAlerta, string> = {
    activa:   'Activa',
    escalada: 'Escalada',
    cerrada:  'Cerrada',
  }

  const estaActiva = alerta.estado === 'activa' || alerta.estado === 'escalada'

  // HU-23: escalamiento automático si no se atiende en un tiempo límite.
  // Todavía no hay backend con temporizadores reales — mientras tanto, se
  // marca visualmente cuándo una alerta ya debería haberse escalado, según
  // su severidad, para que quede claro que el tiempo configurado se venció.
  const LIMITE_MIN: Record<Alerta['severidad'], number> = {
    critica: 15, advertencia: 30, info: 60,
  }
  const debioEscalar = alerta.estado === 'activa' && alerta.minutosActiva > LIMITE_MIN[alerta.severidad]

  return (
    <div className={`ale-card ale-card--${alerta.severidad} ale-card--${alerta.estado}`}>
      {/* Barra lateral de severidad */}
      <div className="ale-severidad-barra" />

      <div className="ale-card-cuerpo">
        {/* Línea 1: ícono + galpón + zona + badge de estado */}
        <div className="ale-card-top">
          <span className={`ale-dot ale-dot--${alerta.severidad}`} />
          <span className="ale-galpon">{alerta.galpon}</span>
          <span className="ale-zona">· {alerta.zona}</span>
          <span className={`ale-estado-badge ale-estado-badge--${alerta.estado}`}>
            {etiquetaEstado[alerta.estado]}
          </span>
          {debioEscalar && (
            <span className="ale-vencida" title={`Lleva más de ${LIMITE_MIN[alerta.severidad]} min sin escalar`}>
              <IcAlert size={11} /> Vencida para escalar
            </span>
          )}
        </div>

        {/* Línea 2: variable, valor actual y rango */}
        <div className="ale-card-mid">
          <strong className="ale-variable">{alerta.variable}</strong>
          <span className="ale-valor">{alerta.valorActual} {alerta.unidad}</span>
          <span className="ale-rango">
            (rango: {alerta.rangoMin > 0 ? `${alerta.rangoMin}–` : ''}{alerta.rangoMax} {alerta.unidad})
          </span>
          {desviacionValida && (
            <span className="ale-desviacion">
              {desviacion}% {sobrePasaMax ? 'sobre el máximo' : 'bajo el mínimo'}
            </span>
          )}
        </div>

        {/* Línea 3: hora, tiempo activa, responsable, acción de cierre */}
        <div className="ale-card-bot">
          <span><IcClock size={12} /> {alerta.fechaHora}</span>
          {estaActiva && <span><IcClock size={12} /> {alerta.minutosActiva} min activa</span>}
          {alerta.responsable  && <span><IcUserCircle size={12} /> {alerta.responsable}</span>}
          {alerta.accionCierre && <span className="ale-accion-cierre"><IcCheck size={12} /> {alerta.accionCierre}</span>}
        </div>
      </div>

      {/* Botones de acción — solo en alertas activas o escaladas */}
      {estaActiva && (
        <div className="ale-acciones">
          {alerta.estado !== 'escalada' && (
            <button className={`ale-btn ale-btn--escalar${debioEscalar ? ' ale-btn--escalar-urgente' : ''}`} onClick={onEscalar}>
              Escalar
            </button>
          )}
          <button className="ale-btn ale-btn--cerrar" onClick={onCerrar}>
            Cerrar alerta
          </button>
        </div>
      )}
    </div>
  )
}

export default AlertasPage
