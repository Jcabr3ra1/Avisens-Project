// MonitoreoPage.tsx — Módulo de Monitoreo Ambiental (EP-04 HU-18 a HU-21).
// Diseño B (Expediente de monitoreo): ficha fija del galpón a la izquierda con
// selector de granja/galpón y salud ambiental; columna derecha con 4 KPIs
// elevados, pestañas flotantes verdes (Sensores / Actuadores), tarjetas de
// sensores alineadas, cámara, lecturas en vivo y tabla de umbrales.

import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import {
  useMonitoreoAmbiental,
  formatearUltimaLectura,
  tieneLecturaUtil,
  estaEncendido,
  textoValor,
  textoSalidaReportada,
  AYUDA_SALIDA_REPORTADA,
  type GalponMonitoreoVista,
  type SensorVista,
  type EstadoSensorVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { semanaDeVida } from '@shared/utils/fechas'
import { SensorDetail } from './SensorDetail'
import { LecturasEnVivo } from './LecturasEnVivo'
import { CamaraGalpon } from './CamaraGalpon'
import { ActuadoresGalpon } from './components/ActuadoresGalpon'
import { esReleControlable } from './model/actuadores'
import AsignarSensores from './AsignarSensores'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import { getRol } from '@shared/api'
import { ROL_OPERARIO } from '@shared/auth/permisos'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcCheck,
  IcFan,
  IcServer,
  IcSettings,
  IcThermo,
} from '@shared/ui/icons/icons'
import '@shared/ui/admin/AdminKit.css'
import './MonitoreoPage.css'

type Seccion = 'sensores' | 'actuadores'

const ETIQUETA_ESTADO: Record<EstadoSensorVista, string> = {
  optimo:                'Óptimo',
  advertencia:           'Advertencia',
  critico:               'Crítico',
  sin_umbral:            'Sin umbral',
  offline:               'Sin señal',
  lectura_no_disponible: 'No disponible',
  obsoleta:              'Desactualizado',
}

function MonitoreoPage({ seccion = 'sensores' }: { seccion?: Seccion }) {
  const { galpones, cargando, error, avisoUltimas, recargar } = useMonitoreoAmbiental()
  useRefetchOnFocus(recargar)
  const [searchParams] = useSearchParams()
  const granjaSolicitada = Number(searchParams.get('granjaId'))

  const [granjaId, setGranjaId] = useState<number | null>(() =>
    Number.isSafeInteger(granjaSolicitada) && granjaSolicitada > 0 ? granjaSolicitada : null,
  )
  const [galponId, setGalponId] = useState<number | null>(null)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)

  const ultimaRecarga = useRef(0)
  function recargarTarjetas() {
    if (Date.now() - ultimaRecarga.current < 20_000) return
    ultimaRecarga.current = Date.now()
    void recargar()
  }

  const granjas = useMemo(() => [...new Map<number, string>(
    galpones.map(g => [g.granjaId, g.origen.granja.nombre] as const),
  ).entries()], [galpones])

  useEffect(() => {
    if (granjas.length === 0 || granjas.some(([id]) => id === granjaId)) return
    const solicitadaDisponible = granjas.some(([id]) => id === granjaSolicitada)
    setGranjaId(solicitadaDisponible ? granjaSolicitada : granjas[0][0])
  }, [granjaId, granjaSolicitada, granjas])

  const galponesDeGranja = useMemo(
    () => galpones.filter(g => g.granjaId === granjaId),
    [galpones, granjaId],
  )

  useEffect(() => {
    if (!galponesDeGranja.some(g => g.id === galponId)) {
      setGalponId(galponesDeGranja[0]?.id ?? null)
      setSensorActivo(null)
    }
  }, [galponId, galponesDeGranja])

  const galpon = galponesDeGranja.find(g => g.id === galponId) ?? galponesDeGranja[0] ?? null

  const sensoresGalpon = galpon?.sensores ?? []
  const relesGalpon = sensoresGalpon.filter(esReleControlable)
  const criticos = sensoresGalpon.filter(s => s.estado === 'critico').length
  const advertencia = sensoresGalpon.filter(s => s.estado === 'advertencia').length
  const optimos = sensoresGalpon.filter(s => s.estado === 'optimo').length
  const sinSenal = sensoresGalpon.filter(
    s => s.estado === 'offline' || s.estado === 'obsoleta' || s.estado === 'lectura_no_disponible',
  ).length
  const conLecturaOk = sensoresGalpon.filter(
    s => s.estado === 'optimo' || s.estado === 'sin_umbral',
  ).length
  const saludAmbientalPct = sensoresGalpon.length > 0
    ? Math.round((conLecturaOk / sensoresGalpon.length) * 100)
    : 0
  const tonoSalud = criticos > 0 ? 'peligro' : advertencia > 0 ? 'alerta' : 'ok'

  const relesConDato = relesGalpon.filter(
    r => r.valor !== null && (r.estado === 'optimo' || r.estado === 'sin_umbral'),
  )
  const relesEncendidos = relesConDato.filter(r => estaEncendido(r.valor!)).length
  const relesApagados = relesConDato.length - relesEncendidos
  const relesSinDato = relesGalpon.length - relesConDato.length

  function abrirDetalle(sensor: SensorVista) {
    if (!puedeAbrirDetalle(sensor)) return
    setSensorActivo(sensor)
  }

  if (cargando && galpones.length === 0) {
    return (
      <div className="page-container mon-page adm-page">
        <p className="mon-cargando">Cargando monitoreo ambiental…</p>
      </div>
    )
  }

  const enActuadores = seccion === 'actuadores'
  const busqueda = granjaId ? `?granjaId=${granjaId}` : ''
  const estadoGalpon = galpon ? estadoGlobal(galpon) : 'offline'

  return (
    <div className="page-container mon-page adm-page">
      <CabeceraAdmin
        eyebrow="Condiciones ambientales"
        titulo={enActuadores ? 'Actuadores del galpón' : 'Monitoreo ambiental'}
        subtitulo={enActuadores
          ? 'Relés K1-K4 del galpón: estado reportado por el ESP32, órdenes y ficha de cada equipo.'
          : 'Lecturas ambientales en tiempo real, estado de sensores y control del galpón.'}
        acciones={galpon ? (
          <div className="mon-cab-acciones">
            <NavLink
              to={`${enActuadores ? '/monitoreo/sensores' : '/monitoreo/actuadores'}${busqueda}`}
              className="adm-btn adm-btn--secundario"
            >
              {enActuadores ? <IcThermo size={15} aria-hidden="true" /> : <IcFan size={15} aria-hidden="true" />}
              {enActuadores ? 'Ver sensores' : `Actuadores (${relesGalpon.length})`}
            </NavLink>
          </div>
        ) : undefined}
      />

      {error && <div className="mon-alert adm-alerta" role="alert">{error}</div>}
      {!error && avisoUltimas && <div className="mon-alert adm-aviso" role="status">{avisoUltimas}</div>}

      {galpones.length === 0 ? (
        getRol() === ROL_OPERARIO
          ? <SinGalponesAsignados queVerias="las lecturas de los sensores de tus galpones" />
          : (
            <section className="mon-card mon-vacio">
              <h2>No hay galpones registrados todavía</h2>
              <p>Cuando exista un galpón con dispositivos asociados, su monitoreo aparecerá aquí.</p>
            </section>
          )
      ) : !galpon ? null : (
        <div className="mon-expediente">
          <aside className="mon-ficha" aria-label="Expediente del galpón en monitoreo">
            <header className="mon-ficha-hero">
              <div className="mon-ficha-hero-top">
                <span className="mon-ficha-pill">
                  <span className={`mon-dot mon-dot--${estadoGalpon}`} aria-hidden="true" />
                  {ETIQUETA_ESTADO[estadoGalpon]}
                </span>
                <span className="mon-ficha-dia">
                  {galpon.loteActivo ? `Día ${galpon.diaVida}` : 'Sin lote'}
                </span>
              </div>

              <h2 className="mon-ficha-codigo">{galpon.nombre}</h2>
              <p className="mon-ficha-ubicacion">
                <IcBarn size={14} aria-hidden="true" />
                <span>Código {galpon.codigo} · {galpon.origen.granja.nombre}</span>
              </p>

              <div className="mon-ficha-tags">
                <span className="mon-ficha-tag">
                  {galpon.loteActivo ? `Lote ${galpon.loteActivo.codigo}` : 'Sin lote activo'}
                </span>
                <span className="mon-ficha-tag">
                  {sensoresGalpon.length} {sensoresGalpon.length === 1 ? 'sensor' : 'sensores'}
                </span>
              </div>
            </header>

            <div className="mon-ficha-cuerpo">
              <div className="mon-ficha-bloque">
                <span className="mon-ficha-seccion-titulo">Ubicación en seguimiento</span>
                <label className="mon-campo">
                  <span>Granja</span>
                  <select
                    value={granjaId ?? ''}
                    onChange={e => {
                      setGranjaId(Number(e.target.value))
                      setGalponId(null)
                      setSensorActivo(null)
                    }}
                  >
                    {granjas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                  </select>
                </label>

                <div className="mon-galpon-lista" role="group" aria-label="Galpones de la granja">
                  {galponesDeGranja.map(g => {
                    const activo = g.id === galpon.id
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className={`mon-galpon-item${activo ? ' is-activo' : ''}`}
                        aria-pressed={activo}
                        onClick={() => { setGalponId(g.id); setSensorActivo(null) }}
                      >
                        <span className={`mon-dot mon-dot--${estadoGlobal(g)}`} aria-hidden="true" />
                        <span className="mon-galpon-texto">
                          <strong>{g.nombre}</strong>
                          <small>Cód. {g.codigo}</small>
                        </span>
                        <span className="mon-galpon-conteo">{g.sensores.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mon-ficha-bloque">
                <span className="mon-ficha-seccion-titulo">Salud ambiental</span>
                <div className="mon-progreso">
                  <div className="mon-progreso-cab">
                    <span>Estabilidad del galpón</span>
                    <strong className={`mon-progreso-val mon-progreso-val--${tonoSalud}`}>
                      {saludAmbientalPct}%
                    </strong>
                  </div>
                  <div className="mon-barra-progreso" aria-hidden="true">
                    <span
                      className={`mon-barra-fill mon-barra-fill--${tonoSalud}`}
                      style={{ width: `${sensoresGalpon.length > 0 ? Math.max(4, saludAmbientalPct) : 0}%` }}
                    />
                  </div>
                  <small className="mon-progreso-pie">
                    {conLecturaOk} de {sensoresGalpon.length} sensores operando en rango normal
                  </small>
                </div>
              </div>

              <div className="mon-ficha-bloque">
                <span className="mon-ficha-seccion-titulo">Resumen del galpón</span>
                <div className="mon-ficha-contadores">
                  <div className="mon-mini-stat">
                    <span>Óptimos</span>
                    <strong>{optimos}</strong>
                  </div>
                  <div className={`mon-mini-stat${criticos + advertencia > 0 ? ' is-alerta' : ''}`}>
                    <span>Alertas</span>
                    <strong>{criticos + advertencia}</strong>
                  </div>
                  <div className="mon-mini-stat">
                    <span>Sin señal</span>
                    <strong>{sinSenal}</strong>
                  </div>
                  <NavLink
                    to={`/monitoreo/actuadores${busqueda}`}
                    className={`mon-mini-stat mon-mini-stat--link${enActuadores ? ' is-activo' : ''}`}
                  >
                    <span>Relés K1-K4</span>
                    <strong>{relesGalpon.length}</strong>
                  </NavLink>
                </div>
              </div>
            </div>
          </aside>

          <div className="mon-main">
            {enActuadores ? (
              <section className="mon-kpis" aria-label="Resumen de actuadores">
                <article className="mon-kpi mon-kpi--primario">
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Relés K1-K4</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcFan size={15} /></span>
                  </span>
                  <strong>{relesGalpon.length}</strong>
                  <small>Equipos registrados</small>
                </article>
                <article className="mon-kpi mon-kpi--ok">
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Encendidos</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcCheck size={15} /></span>
                  </span>
                  <strong>{relesEncendidos}</strong>
                  <small>Salida activa reportada</small>
                </article>
                <article className="mon-kpi mon-kpi--info">
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Apagados</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcSettings size={15} /></span>
                  </span>
                  <strong>{relesApagados}</strong>
                  <small>Equipos en reposo</small>
                </article>
                <article className={`mon-kpi mon-kpi--${relesSinDato > 0 ? 'advertencia' : 'ok'}`}>
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Sin reporte</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcAlert size={15} /></span>
                  </span>
                  <strong>{relesSinDato}</strong>
                  <small>Pendientes del ESP32</small>
                </article>
              </section>
            ) : (
              <section className="mon-kpis" aria-label="Resumen ambiental del galpón">
                <article className="mon-kpi mon-kpi--ok">
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Óptimos</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcCheck size={15} /></span>
                  </span>
                  <strong>{optimos}</strong>
                  <small>Dentro de rango ideal</small>
                </article>
                <article className={`mon-kpi mon-kpi--${advertencia > 0 ? 'advertencia' : 'primario'}`}>
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Advertencia</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcAlert size={15} /></span>
                  </span>
                  <strong>{advertencia}</strong>
                  <small>Desviación moderada</small>
                </article>
                <article className={`mon-kpi mon-kpi--${criticos > 0 ? 'peligro' : 'primario'}`}>
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Críticos</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcAlert size={15} /></span>
                  </span>
                  <strong>{criticos}</strong>
                  <small>Atención inmediata</small>
                </article>
                <article className="mon-kpi mon-kpi--info">
                  <span className="mon-kpi-cab">
                    <span className="mon-kpi-etiqueta">Sin señal</span>
                    <span className="mon-kpi-icono" aria-hidden="true"><IcServer size={15} /></span>
                  </span>
                  <strong>{sinSenal}</strong>
                  <small>Offline o desactualizados</small>
                </article>
              </section>
            )}

            <nav className="mon-secciones" aria-label="Secciones de Monitoreo">
              <NavLink
                to={`/monitoreo/sensores${busqueda}`}
                className={`mon-seccion${!enActuadores ? ' mon-seccion--activa' : ''}`}
                aria-current={!enActuadores ? 'page' : undefined}
              >
                <IcThermo size={15} aria-hidden="true" />
                <span>Sensores</span>
                <span className="mon-seccion-conteo">{sensoresGalpon.length}</span>
              </NavLink>
              <NavLink
                to={`/monitoreo/actuadores${busqueda}`}
                className={`mon-seccion${enActuadores ? ' mon-seccion--activa' : ''}`}
                aria-current={enActuadores ? 'page' : undefined}
              >
                <IcFan size={15} aria-hidden="true" />
                <span>Actuadores</span>
                <span className="mon-seccion-conteo">{relesGalpon.length}</span>
              </NavLink>
            </nav>

            {enActuadores ? (
              <section className="mon-card" aria-labelledby="mon-actuadores-titulo">
                <header className="mon-seccion-cab">
                  <div className="mon-seccion-titulos">
                    <p className="mon-kicker">Control de equipos</p>
                    <h2 id="mon-actuadores-titulo">Relés K1-K4 de {galpon.nombre}</h2>
                    <p className="mon-seccion-sub">
                      Consulta el estado que informa el ESP32 y envía órdenes manuales o vuelve a modo automático.
                    </p>
                  </div>
                </header>
                <ActuadoresGalpon
                  galponId={galpon.id}
                  sensores={galpon.sensores}
                  onCambio={() => { void recargar() }}
                />
              </section>
            ) : (
              <>
                <AsignarSensores
                  key={galpon.id}
                  galponId={galpon.id}
                  galponCodigo={galpon.codigo}
                  galponNombre={galpon.nombre}
                  recargar={recargar}
                />

                <section className="mon-card" aria-labelledby="mon-lecturas-titulo">
                  <header className="mon-seccion-cab">
                    <div className="mon-seccion-titulos">
                      <p className="mon-kicker">Tiempo real</p>
                      <div className="mon-titulo-con-conteo">
                        <h2 id="mon-lecturas-titulo">Sensores de {galpon.nombre}</h2>
                        <span className="mon-conteo">{sensoresGalpon.length}</span>
                      </div>
                      <p className="mon-seccion-sub">
                        Selecciona una tarjeta para abrir su medidor, histórico y referencia técnica.
                      </p>
                    </div>
                    {relesGalpon.length > 0 && (
                      <NavLink to={`/monitoreo/actuadores${busqueda}`} className="mon-link-actuadores">
                        <span>Controlar relés K1-K4</span>
                        <IcArrowRight size={14} aria-hidden="true" />
                      </NavLink>
                    )}
                  </header>

                  {sensoresGalpon.length === 0 && !galpon.loteActivo ? (
                    <div className="mon-offline-msg">
                      <IcServer size={30} />
                      <p>Galpón sin lote activo y sin sensores registrados.</p>
                    </div>
                  ) : sensoresGalpon.length === 0 ? (
                    <div className="mon-offline-msg">
                      <IcServer size={30} />
                      <p>Este galpón todavía no tiene sensores registrados.</p>
                    </div>
                  ) : (
                    <div className="mon-sensores">
                      {sensoresGalpon.map(s => (
                        <TarjetaSensor
                          key={s.id}
                          sensor={s}
                          activo={sensorActivo?.id === s.id}
                          onClick={() => abrirDetalle(s)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <CamaraGalpon key={galpon.id} galponId={galpon.id} />

                {sensoresGalpon.length > 0 && (
                  <LecturasEnVivo sensores={sensoresGalpon} onNuevaLectura={recargarTarjetas} />
                )}

                {sensoresGalpon.length > 0 && (
                  <section className="mon-section">
                    <header className="mon-seccion-cab">
                      <div className="mon-seccion-titulos">
                        <p className="mon-kicker">Referencia de rangos</p>
                        <h2 className="mon-section-title">
                          Sensores y umbrales{galpon.loteActivo ? ` · Semana ${semanaDeVida(galpon.diaVida) + 1}` : ''}
                        </h2>
                        <p className="mon-section-sub">
                          Los umbrales aplican a temperatura, humedad y luminosidad; las demás variables se muestran sin rango.
                        </p>
                      </div>
                    </header>

                    <div className="mon-tabla-card">
                      <div className="mon-tabla-head mon-tabla--sensores">
                        <span>ID</span><span>Sensor</span><span>Estado</span><span>Valor</span><span>Mín.</span><span>Máx.</span><span>Última lectura</span>
                      </div>
                      {sensoresGalpon.map(s => (
                        <div key={`${s.id}-u`} className="mon-tabla-row mon-tabla--sensores">
                          <span className="mon-tabla-id">#{s.id}</span>
                          <span className="mon-tabla-sensor">
                            <span>{iconoSensor(s.tipo, 14)} {s.tipo}</span>
                            <small>{s.codigo}</small>
                          </span>
                          <span>
                            <InsigniaEstado sensor={s} />
                          </span>
                          <span>
                            {s.valor === null ? '—' : <><strong>{textoValor(s, s.valor)}</strong> <InsigniaSinCalibrar sensor={s} /></>}
                          </span>
                          <span className="mon-tabla-num">{s.minUmbral ?? '—'}</span>
                          <span className="mon-tabla-num">{s.maxUmbral ?? '—'}</span>
                          <span className="mon-tabla-ultima">{formatearUltimaLectura(s.ultimaLecturaTs)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <SensorDetail
                  sensor={sensorActivo}
                  galponNombre={galpon.nombre}
                  diaVida={galpon.loteActivo ? galpon.diaVida : null}
                  onClose={() => setSensorActivo(null)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function puedeAbrirDetalle(sensor: SensorVista): boolean {
  return tieneLecturaUtil(sensor.estado) && !sensor.esEstado
}

function InsigniaEstado({ sensor }: { sensor: SensorVista }) {
  const vigente = sensor.esEstado && sensor.valor !== null &&
    (sensor.estado === 'sin_umbral' || sensor.estado === 'optimo')
  if (vigente) {
    const on = estaEncendido(sensor.valor!)
    return (
      <span className={`mon-estado-badge mon-estado-badge--${on ? 'encendido' : 'apagado'}`} title={AYUDA_SALIDA_REPORTADA}>
        {textoSalidaReportada(on)}
      </span>
    )
  }
  return (
    <span className={`mon-estado-badge mon-estado-badge--${sensor.estado}`}>
      {ETIQUETA_ESTADO[sensor.estado]}
    </span>
  )
}

function InsigniaSinCalibrar({ sensor }: { sensor: SensorVista }) {
  if (!sensor.sinCalibrar || sensor.valor === null) return null
  return (
    <span
      className="mon-estado-badge mon-estado-badge--advertencia"
      title="El ESP32 envió esta lectura sin calibración: el número no es una medida física confirmada."
    >
      Sin calibrar
    </span>
  )
}

type TarjetaProps = {
  sensor: SensorVista
  activo: boolean
  onClick: () => void
}

function TarjetaSensor({ sensor, activo, onClick }: TarjetaProps) {
  const rango = sensor.minUmbral !== null && sensor.maxUmbral !== null ? sensor.maxUmbral - sensor.minUmbral : 0
  const relativo = rango > 0 && sensor.valor !== null
    ? Math.min(100, Math.max(0, ((sensor.valor - (sensor.minUmbral ?? 0)) / rango) * 100))
    : 50

  return (
    <button
      type="button"
      className={[
        'mon-sensor-card',
        `mon-sensor-card--${sensor.estado}`,
        activo ? 'mon-sensor-card--activo' : '',
        puedeAbrirDetalle(sensor) ? 'mon-sensor-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={
        puedeAbrirDetalle(sensor)
          ? `Ver detalle de ${sensor.tipo}`
          : sensor.esEstado && tieneLecturaUtil(sensor.estado) ? `${sensor.tipo}: ${textoValor(sensor, sensor.valor)}`
          : sensor.estado === 'lectura_no_disponible' ? 'Sin dato disponible' : 'Sensor sin señal'
      }
      aria-pressed={activo}
      disabled={!puedeAbrirDetalle(sensor)}
    >
      <div className="mon-sensor-top">
        <div className="mon-sensor-icon" aria-hidden="true">{iconoSensor(sensor.tipo, 19)}</div>
        <div className="mon-sensor-info">
          <span className="mon-sensor-nombre">{sensor.tipo}</span>
          <span className="mon-sensor-zona">#{sensor.id} · {sensor.codigo}</span>
        </div>
        {puedeAbrirDetalle(sensor) && (
          <span className="mon-sensor-hint" aria-hidden="true">
            <IcArrowRight size={15} />
          </span>
        )}
      </div>

      <div className="mon-sensor-valor">
        {sensor.estado === 'offline' || sensor.valor === null
          ? <span className="mon-offline-txt">—</span>
          : sensor.esEstado
            ? <strong className={`mon-onoff mon-onoff--${estaEncendido(sensor.valor) ? 'on' : 'off'}`}>{textoValor(sensor, sensor.valor)}</strong>
            : <><strong>{sensor.valor}</strong><small>{sensor.unidad}</small></>
        }
        <InsigniaSinCalibrar sensor={sensor} />
      </div>

      {tieneLecturaUtil(sensor.estado) && rango > 0 ? (
        <div className="mon-barra-bloque">
          <div className="mon-barra-wrap">
            <div className="mon-barra" style={{ width: `${relativo}%` }} />
          </div>
          <div className="mon-barra-rangos">
            <span>{sensor.minUmbral} {sensor.unidad}</span>
            <span>{sensor.maxUmbral} {sensor.unidad}</span>
          </div>
        </div>
      ) : (
        <div className="mon-barra-espaciador" aria-hidden="true" />
      )}

      <div className="mon-sensor-footer">
        <InsigniaEstado sensor={sensor} />
        <span className="mon-ultima">{formatearUltimaLectura(sensor.ultimaLecturaTs)}</span>
      </div>
    </button>
  )
}

function estadoGlobal(galpon: GalponMonitoreoVista): EstadoSensorVista {
  if (galpon.sensores.length === 0) return 'offline'
  if (galpon.sensores.some(s => s.estado === 'critico')) return 'critico'
  if (galpon.sensores.some(s => s.estado === 'advertencia')) return 'advertencia'
  if (galpon.sensores.some(s => s.estado === 'obsoleta')) return 'obsoleta'
  if (galpon.sensores.some(s => s.estado === 'lectura_no_disponible')) return 'lectura_no_disponible'
  return 'optimo'
}

export default MonitoreoPage
