import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RiesgoCalorResumen from '@features/dashboard/components/RiesgoCalorResumen'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import BannerSaludo from '@shared/ui/BannerSaludo/BannerSaludo'
import { saludoSegunHora } from '@shared/ui/BannerSaludo/saludo'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcBox,
  IcCheck,
  IcDoc,
  IcEgg,
  IcFan,
  IcSeed,
  IcThermo,
} from '@shared/ui/icons/icons'
import { iconoSensor } from '@shared/ui/sensorIcon'
import ModalRegistroOperario from './components/ModalRegistroOperario'
import ResumenLoteOperario from './components/ResumenLoteOperario'
import TarjetaJornada from './components/TarjetaJornada'
import { useInicioOperario } from './hooks/useInicioOperario'
import { useJornadaOperario } from './hooks/useJornadaOperario'
import { useResumenLoteOperario } from './hooks/useResumenLoteOperario'
import { rutaDeAtencion } from './model/destinosOperario'
import type { JornadaOperario } from './model/jornadaOperario'
import '@shared/ui/admin/AdminKit.css'
import './OperarioPage.css'

type RegistroAbierto = { tipo: 'mortalidad' | 'consumo'; jornada: JornadaOperario } | null

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const capitalizar = (texto: string) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto)

function EsqueletoJornada() {
  return (
    <div className="page-container adm-page op-page" aria-busy="true" aria-label="Cargando tu jornada">
      <div className="op-hueso op-hueso--cabecera" />
      <div className="op-hueso op-hueso--kpis" />
      <div className="op-workspace">
        <div className="op-hueso op-hueso--panel" />
        <div className="op-hueso op-hueso--panel" />
      </div>
    </div>
  )
}

function OperarioPage() {
  const navigate = useNavigate()
  const inicio = useInicioOperario()
  const jornada = useJornadaOperario()
  const registrosLote = useResumenLoteOperario()
  const [registroAbierto, setRegistroAbierto] = useState<RegistroAbierto>(null)
  const { dashboard } = inicio
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] || 'operario'
  const fecha = capitalizar(
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
  )

  function recargarTodo() {
    void dashboard.recargar()
    void jornada.recargar()
    void registrosLote.recargar()
  }

  if (dashboard.cargando && dashboard.granjas.length === 0) return <EsqueletoJornada />

  if (!dashboard.cargando && !jornada.cargando && dashboard.totalGalpones === 0 && jornada.jornadas.length === 0) {
    return (
      <div className="page-container adm-page op-page">
        <SinGalponesAsignados queVerias="tu jornada: el estado de cada galpón, sus sensores y los botones para registrar mortalidad y consumo" />
      </div>
    )
  }

  const jornadaActiva =
    jornada.jornadas.find((item) => item.galpon.id === dashboard.galponId)
    ?? jornada.jornadas.find((item) => item.lote !== null)
    ?? jornada.jornadas[0]
    ?? null

  const alertasAbiertas = dashboard.alertasGranja.filter((alerta) => alerta.estado !== 'cerrada').length

  return (
    <div className="page-container adm-page op-page">
      {/* ── Banner de saludo unificado con acciones de turno ── */}
      <BannerSaludo
        fecha={fecha}
        contexto={dashboard.granja ? `Mi jornada · ${dashboard.granja.nombre}` : 'Mi jornada'}
        titulo={`${saludoSegunHora()}, ${nombre}`}
        subtitulo={inicio.estado.titulo}
        acciones={(
          <>
            {dashboard.granjas.length > 1 && (
              <label className="bs-selector">
                <span className="sr-only">Granja</span>
                <select
                  value={dashboard.granjaId ?? ''}
                  onChange={(evento) => dashboard.seleccionarGranja(Number(evento.target.value))}
                >
                  {dashboard.granjas.map((granja) => (
                    <option key={granja.id} value={granja.id}>{granja.nombre}</option>
                  ))}
                </select>
              </label>
            )}

            {jornadaActiva?.lote && (
              <>
                <button
                  type="button"
                  className="bs-btn"
                  onClick={() => setRegistroAbierto({ tipo: 'mortalidad', jornada: jornadaActiva })}
                >
                  <IcAlert size={15} aria-hidden="true" />
                  Mortalidad
                </button>
                <button
                  type="button"
                  className="bs-btn bs-btn--primario"
                  onClick={() => setRegistroAbierto({ tipo: 'consumo', jornada: jornadaActiva })}
                >
                  <IcSeed size={15} aria-hidden="true" />
                  Registrar consumo
                </button>
              </>
            )}
          </>
        )}
      />

      {/* ── 4 KPIs elevados con borde superior de color ── */}
      <div className="op-kpis" aria-label="Resumen de tu turno">
        <div className="op-kpi op-kpi--primario op-kpi--estatico">
          <span className="op-kpi-cab">
            <span className="op-kpi-etiqueta">Galpones a cargo</span>
            <span className="op-kpi-icono" aria-hidden="true"><IcBarn size={15} /></span>
          </span>
          <strong>{jornada.jornadas.length}</strong>
          <small>{dashboard.granja?.nombre ?? 'Asignados hoy'}</small>
        </div>

        <div className="op-kpi op-kpi--ok op-kpi--estatico">
          <span className="op-kpi-cab">
            <span className="op-kpi-etiqueta">Aves alojadas</span>
            <span className="op-kpi-icono" aria-hidden="true"><IcEgg size={15} /></span>
          </span>
          <strong>{entero.format(inicio.avesAlojadas)}</strong>
          <small>{inicio.diaUnico ? `Día ${inicio.diaUnico} de ciclo` : 'En lotes activos'}</small>
        </div>

        <button
          type="button"
          className="op-kpi op-kpi--info"
          onClick={() => navigate('/monitoreo/sensores')}
        >
          <span className="op-kpi-cab">
            <span className="op-kpi-etiqueta">Sensores en línea</span>
            <span className="op-kpi-icono" aria-hidden="true"><IcThermo size={15} /></span>
          </span>
          <strong>
            {inicio.sensoresDelGalpon === 0 ? '0' : `${inicio.reportando}/${inicio.sensoresDelGalpon}`}
          </strong>
          <small>
            {inicio.sensoresDelGalpon === 0
              ? 'Sin sensores instalados'
              : inicio.reportando === inicio.sensoresDelGalpon
                ? 'Todos reportando'
                : 'Revisar sensores →'}
          </small>
        </button>

        <button
          type="button"
          className={`op-kpi op-kpi--${alertasAbiertas > 0 ? 'peligro' : 'ok'}`}
          onClick={() => navigate('/alertas')}
        >
          <span className="op-kpi-cab">
            <span className="op-kpi-etiqueta">Alertas activas</span>
            <span className="op-kpi-icono" aria-hidden="true">
              {alertasAbiertas > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
            </span>
          </span>
          <strong className={alertasAbiertas > 0 ? 'op-kpi--peligro' : 'op-kpi--ok'}>
            {alertasAbiertas}
          </strong>
          <small>{alertasAbiertas > 0 ? 'Requieren revisión →' : 'Sin alertas abiertas'}</small>
        </button>
      </div>

      {(dashboard.error || jornada.error) && (
        <div className="adm-alerta" role="alert">
          <span>{jornada.error || dashboard.error}</span>
          <button type="button" onClick={recargarTodo}>Reintentar</button>
        </div>
      )}

      {jornada.mensaje && (
        <div className="op-toast-ok" role="status">
          <IcCheck size={16} aria-hidden="true" />
          <span>{jornada.mensaje}</span>
        </div>
      )}

      {/* ── Pendientes urgentes (solo si hay algo que atender) ── */}
      {inicio.atencion.length > 0 && (
        <section className="op-atencion" aria-label="Requiere atención ahora">
          <header className="op-atencion-cabecera">
            <span className="op-atencion-icono" aria-hidden="true">
              <IcAlert size={16} />
            </span>
            <div>
              <span className="op-rotulo">Prioridad del turno</span>
              <h2>Requiere atención ahora</h2>
            </div>
            <span className="op-conteo is-alerta">{inicio.atencion.length}</span>
          </header>

          <ul className="op-atencion-lista">
            {inicio.atencion.map((item) => (
              <li key={item.id} className={`op-atencion-item${item.critico ? ' op-atencion-item--critico' : ''}`}>
                <div className="op-atencion-texto">
                  <strong>{item.titulo}</strong>
                  <span>{item.detalle}</span>
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn--secundario"
                  onClick={() => navigate(rutaDeAtencion(item))}
                >
                  Revisar <IcArrowRight size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Selector único de galpón (si tiene más de 1) ── */}
      {inicio.filas.length > 1 && (
        <div className="op-galpon-tabs" role="tablist" aria-label="Galpón en foco">
          {inicio.filas.map((fila) => {
            const activo = fila.id === dashboard.galponId
            return (
              <button
                key={fila.id}
                type="button"
                role="tab"
                aria-selected={activo}
                className={`op-galpon-tab${activo ? ' is-activa' : ''}`}
                onClick={() => dashboard.seleccionarGalpon(fila.id)}
              >
                <IcBarn size={14} aria-hidden="true" />
                <span>{fila.nombre}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Espacio operativo alineado en filas emparejadas ── */}
      <div className="op-workspace">
        <ResumenLoteOperario
          lote={dashboard.lote}
          diaLote={dashboard.diaLote}
          nombreGalpon={dashboard.galpon?.nombre ?? null}
          galponId={dashboard.galponId}
          mortalidad={registrosLote.mortalidad}
          consumos={registrosLote.consumos}
          eventos={registrosLote.eventos}
          alertas={dashboard.alertasGranja}
          indicadores={inicio.indicadores}
          cargandoRegistros={registrosLote.cargando}
          cargandoIndicadores={inicio.cargandoLote}
          error={registrosLote.error}
          onAbrirGuia={(loteId) => navigate(`/guia-crecimiento?lote=${loteId}`)}
        />

        {jornada.jornadas.length > 0 && (
          <section className="op-card" aria-labelledby="operario-registro-titulo">
            <header className="op-card-cabecera">
              <div>
                <span className="op-rotulo">Acciones de campo</span>
                <h2 id="operario-registro-titulo">Registro de hoy</h2>
              </div>
              <span className="op-conteo">{jornada.jornadas.length}</span>
            </header>

            <div className="op-jornadas-lista">
              {jornada.jornadas.map((item) => (
                <TarjetaJornada
                  key={item.galpon.id}
                  jornada={item}
                  destacado={item.galpon.id === dashboard.galponId}
                  onRegistrarMortalidad={() => setRegistroAbierto({ tipo: 'mortalidad', jornada: item })}
                  onRegistrarConsumo={() => setRegistroAbierto({ tipo: 'consumo', jornada: item })}
                  onVerCrecimiento={() => item.lote && navigate(`/guia-crecimiento?lote=${item.lote.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="op-card" aria-labelledby="op-ambiente-titulo">
          <header className="op-card-cabecera">
            <div>
              <span className="op-rotulo">Ambiente en vivo</span>
              <h2 id="op-ambiente-titulo">
                {dashboard.galpon ? `Sensores de ${dashboard.galpon.nombre}` : 'Sensores del galpón'}
              </h2>
            </div>
            <div className="op-card-enlaces">
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => navigate('/monitoreo/sensores')}
              >
                <IcThermo size={14} aria-hidden="true" /> Sensores
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => navigate('/monitoreo/actuadores')}
              >
                <IcFan size={14} aria-hidden="true" /> Actuadores
              </button>
            </div>
          </header>

          {inicio.sensoresEscena.length === 0 ? (
            <div className="op-vacio-inline">
              <IcThermo size={18} aria-hidden="true" />
              <span>Este galpón no tiene sensores reportando todavía.</span>
            </div>
          ) : (
            <ul className="op-sensores-grid" aria-label="Lecturas actuales">
              {inicio.sensoresEscena.map((sensor) => (
                <li key={sensor.id} className={`op-sensor op-sensor--${sensor.estado}`}>
                  <div className="op-sensor-top">
                    <span className="op-sensor-icono" aria-hidden="true">
                      {iconoSensor(sensor.nombre, 16)}
                    </span>
                    <span className="op-sensor-tipo">{sensor.nombre}</span>
                    <span className={`op-sensor-badge op-sensor-badge--${sensor.estado}`}>
                      {sensor.etiquetaEstado}
                    </span>
                  </div>
                  <strong className="op-sensor-valor">
                    {sensor.valor === null ? '—' : decimal.format(sensor.valor)}
                    <small>{sensor.unidad}</small>
                  </strong>
                  {sensor.minUmbral !== null && sensor.maxUmbral !== null && (
                    <span className="op-sensor-rango">
                      Óptimo {decimal.format(sensor.minUmbral)}–{decimal.format(sensor.maxUmbral)} {sensor.unidad}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {dashboard.galponId !== null && (
            <div className="op-riesgo-wrap">
              <RiesgoCalorResumen galponId={dashboard.galponId} />
            </div>
          )}
        </section>

        <section className="op-card op-accesos-card" aria-labelledby="op-accesos-titulo">
          <header className="op-card-cabecera">
            <div>
              <span className="op-rotulo">Módulos del turno</span>
              <h2 id="op-accesos-titulo">Accesos rápidos</h2>
            </div>
          </header>
          <div className="op-accesos-lista">
            <button type="button" className="op-acceso" onClick={() => navigate('/bitacora')}>
              <span className="op-acceso-icono" aria-hidden="true"><IcDoc size={16} /></span>
              <span className="op-acceso-texto">
                <strong>Bitácora completa</strong>
                <small>Pesajes, sanidad, mortalidad y consumos</small>
              </span>
              <IcArrowRight size={15} aria-hidden="true" />
            </button>

            <button type="button" className="op-acceso" onClick={() => navigate('/inventario')}>
              <span className="op-acceso-icono" aria-hidden="true"><IcBox size={16} /></span>
              <span className="op-acceso-texto">
                <strong>Bodega e insumos</strong>
                <small>Stock disponible y salidas de bodega</small>
              </span>
              <IcArrowRight size={15} aria-hidden="true" />
            </button>

            <button type="button" className="op-acceso" onClick={() => navigate('/alertas')}>
              <span className="op-acceso-icono" aria-hidden="true"><IcAlert size={16} /></span>
              <span className="op-acceso-texto">
                <strong>Alertas del galpón</strong>
                <small>{alertasAbiertas > 0 ? `${alertasAbiertas} por revisar` : 'Sin pendientes'}</small>
              </span>
              <IcArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      {registroAbierto && (
        <ModalRegistroOperario
          tipo={registroAbierto.tipo}
          jornada={registroAbierto.jornada}
          loteInicialId={dashboard.lote?.id}
          guardando={jornada.guardando}
          onCerrar={() => setRegistroAbierto(null)}
          onRegistrarMortalidad={async (loteId, registro, foto) => {
            await jornada.registrarMortalidad(loteId, registro, foto)
            void dashboard.recargar()
            void registrosLote.recargar()
          }}
          onRegistrarConsumo={async (loteId, registro) => {
            await jornada.registrarConsumo(loteId, registro)
            void dashboard.recargar()
            void registrosLote.recargar()
          }}
        />
      )}
    </div>
  )
}

export default OperarioPage
