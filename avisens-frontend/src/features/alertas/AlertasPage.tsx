// AlertasPage.tsx — Módulo de Alertas (EP-05 HU-22 a HU-25).
// Las alertas ACTIVAS se calculan en vivo a partir de los mismos sensores
// reales que muestra Monitoreo (useMonitoreoAmbiental) — nunca puede
// desincronizarse porque lee la misma fuente. El HISTÓRICO de cerradas sigue
// viniendo de un mock: no hay ninguna tabla en el backend todavía para
// persistir alertas ya resueltas (ver ALERTAS_MOCK en ./data).

import { useRef, useState } from 'react'
import { ALERTAS_MOCK, type Alerta, type EstadoAlerta } from './data'
import { useMonitoreoAmbiental, formatearUltimaLectura } from '@shared/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { IcCheck, IcPaperclip, IcAlert, IcClock, IcUserCircle } from '@shared/ui/icons/icons'
import './AlertasPage.css'

// ─── Tipos del modal de cierre ────────────────────────────────────────────────
type FormCierre = {
  comentario: string
  fotoNombre: string | null
}

// ─── Componente principal ─────────────────────────────────────────────────────
function AlertasPage() {
  const { galpones, cargando, error } = useMonitoreoAmbiental()

  // El histórico de cerradas es mock (sin backend); las activas se calculan
  // abajo en cada render a partir del hook — no viven en este estado.
  const [historial] = useState<Alerta[]>(ALERTAS_MOCK.filter(a => a.estado === 'cerrada'))

  // Decisiones del usuario sobre alertas activas (cerrar/escalar), guardadas
  // por id de sensor — mientras el sensor SIGA fuera de rango se respeta la
  // decisión; si vuelve a rango, la alerta desaparece sola y se olvida.
  const [decisiones, setDecisiones] = useState<Record<number, { estado: 'escalada' | 'cerrada'; accionCierre?: string }>>({})

  // A qué hora (reloj del navegador) se detectó por primera vez cada alerta activa.
  const inicioAlerta = useRef<Record<number, number>>({})

  // ── Arma las alertas activas a partir de los sensores en advertencia/crítico ──
  const activas: Alerta[] = []
  for (const galpon of galpones) {
    for (const sensor of galpon.sensores) {
      if (sensor.estado !== 'advertencia' && sensor.estado !== 'critico') {
        delete inicioAlerta.current[sensor.id]
        continue
      }
      if (!inicioAlerta.current[sensor.id]) inicioAlerta.current[sensor.id] = Date.now()
      const minutosActiva = Math.floor((Date.now() - inicioAlerta.current[sensor.id]) / 60000)
      const decision = decisiones[sensor.id]

      activas.push({
        id: sensor.id,
        galpon: `${galpon.nombre} (${galpon.codigo})`,
        zona: sensor.codigo,
        variable: sensor.tipo,
        valorActual: sensor.valor ?? 0,
        unidad: sensor.unidad,
        rangoMin: sensor.minUmbral ?? 0,
        rangoMax: sensor.maxUmbral ?? 0,
        severidad: sensor.estado === 'critico' ? 'critica' : 'advertencia',
        estado: decision?.estado ?? 'activa',
        fechaHora: formatearUltimaLectura(sensor.ultimaLecturaTs),
        minutosActiva,
        accionCierre: decision?.accionCierre,
      })
    }
  }

  // Las cerradas por el usuario en esta sesión se van al historial visible.
  const cerradasPorUsuario = activas.filter(a => a.estado === 'cerrada')
  const activasVisibles = activas.filter(a => a.estado !== 'cerrada')
  const historialCompleto = [...cerradasPorUsuario, ...historial]

  // Pestaña activa: 'activas' o 'historial'
  const [tab, setTab] = useState<'activas' | 'historial'>('activas')

  // ID de la alerta que se está cerrando (null = modal cerrado)
  const [cierreId, setCierreId] = useState<number | null>(null)

  const [formCierre, setFormCierre] = useState<FormCierre>({ comentario: '', fotoNombre: null })
  const [errorCierre, setErrorCierre] = useState('')
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const lista = tab === 'activas' ? activasVisibles : historialCompleto

  function abrirCierre(id: number) {
    setFormCierre({ comentario: '', fotoNombre: null })
    setErrorCierre('')
    setCierreId(id)
  }

  function confirmarCierre() {
    if (!formCierre.comentario.trim()) {
      setErrorCierre('El comentario es obligatorio para cerrar la alerta.')
      return
    }
    if (!formCierre.fotoNombre) {
      setErrorCierre('Debes adjuntar al menos una fotografía como evidencia.')
      return
    }
    if (cierreId !== null) {
      setDecisiones(prev => ({ ...prev, [cierreId]: { estado: 'cerrada', accionCierre: formCierre.comentario } }))
    }
    setCierreId(null)
  }

  function escalarAlerta(id: number) {
    setDecisiones(prev => ({ ...prev, [id]: { estado: 'escalada' } }))
  }

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

        <div className="ale-contadores">
          <span className="ale-contador ale-contador--critico">
            <span className="ale-dot ale-dot--critica" /> {activasVisibles.filter(a => a.severidad === 'critica').length} críticas
          </span>
          <span className="ale-contador ale-contador--advertencia">
            <span className="ale-dot ale-dot--advertencia" /> {activasVisibles.filter(a => a.severidad === 'advertencia').length} advertencias
          </span>
        </div>
      </header>

      {error && <div className="ale-alert-error" role="alert">{error}</div>}

      {/* ── Pestañas ────────────────────────────────────────────────────────── */}
      <div className="ale-tabs">
        <button
          className={`ale-tab${tab === 'activas' ? ' ale-tab--activo' : ''}`}
          onClick={() => setTab('activas')}
        >
          Activas
          {activasVisibles.length > 0 && <span className="ale-tab-badge">{activasVisibles.length}</span>}
        </button>
        <button
          className={`ale-tab${tab === 'historial' ? ' ale-tab--activo' : ''}`}
          onClick={() => setTab('historial')}
        >
          Historial ({historialCompleto.length})
        </button>
      </div>

      {/* ── Lista de alertas ────────────────────────────────────────────────── */}
      {cargando ? (
        <p className="ale-vacio-txt">Cargando alertas…</p>
      ) : lista.length === 0
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
      {cierreId !== null && (
        <div className="ale-modal-overlay" onClick={() => setCierreId(null)}>
          <div className="ale-modal-card" onClick={e => e.stopPropagation()}>

            <h2 className="ale-modal-titulo">Cerrar alerta</h2>
            <p className="ale-modal-desc">
              Describe la acción correctiva aplicada y adjunta una fotografía como evidencia.
              Ambos campos son obligatorios (EP-05 HU-24).
            </p>

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

            <label className="ale-modal-label">
              <span>Fotografía de evidencia <em>(obligatorio)</em></span>
              <div className="ale-foto-area" onClick={() => inputFotoRef.current?.click()}>
                {formCierre.fotoNombre
                  ? <span className="ale-foto-nombre"><IcPaperclip size={14} /> {formCierre.fotoNombre}</span>
                  : <span className="ale-foto-placeholder"><IcPaperclip size={14} /> Toca aquí para adjuntar una foto</span>
                }
              </div>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="ale-foto-input"
                onChange={handleFoto}
              />
            </label>

            {errorCierre && <p className="ale-modal-error" role="alert">{errorCierre}</p>}

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

  const LIMITE_MIN: Record<Alerta['severidad'], number> = {
    critica: 15, advertencia: 30, info: 60,
  }
  const debioEscalar = alerta.estado === 'activa' && alerta.minutosActiva > LIMITE_MIN[alerta.severidad]

  return (
    <div className={`ale-card ale-card--${alerta.severidad} ale-card--${alerta.estado}`}>
      <div className="ale-severidad-barra" />

      <div className="ale-card-cuerpo">
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

        <div className="ale-card-mid">
          <strong className="ale-variable">{iconoSensor(alerta.variable, 13)} {alerta.variable}</strong>
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

        <div className="ale-card-bot">
          <span><IcClock size={12} /> {alerta.fechaHora}</span>
          {estaActiva && <span><IcClock size={12} /> {alerta.minutosActiva} min activa</span>}
          {alerta.responsable  && <span><IcUserCircle size={12} /> {alerta.responsable}</span>}
          {alerta.accionCierre && <span className="ale-accion-cierre"><IcCheck size={12} /> {alerta.accionCierre}</span>}
        </div>
      </div>

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
