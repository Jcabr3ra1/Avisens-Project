import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_OPERARIO, ROL_PROPIETARIO } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import { IcAlert, IcBarn, IcBell, IcChevronDown } from '@shared/ui/icons/icons'
import AvisoStockBajo from './components/AvisoStockBajo'
import BannerAlertaCritica from './components/BannerAlertaCritica'
import ListaAlertas from './components/ListaAlertas'
import PanelAlerta from './components/PanelAlerta'
import ResumenAlertas, { type TarjetaResumenAlerta } from './components/ResumenAlertas'
import { useAlertas } from './hooks/useAlertas'
import { useGalponesAsignados } from './hooks/useGalponesAsignados'
import { useStockBajo } from './hooks/useStockBajo'
import {
  esCriticidadAlta,
  filtrarAlertas,
  normalizarCriticidad,
  obtenerResumenAlertas,
  type Alerta,
  type FiltrosAlertas as FiltrosAlertasModel,
} from './model/alerta'
import Cargando from '@shared/ui/Estados/Cargando'
import '@shared/ui/admin/AdminKit.css'
import './AlertasPage.css'

const FILTROS_INICIALES: FiltrosAlertasModel = {
  estado: 'todas',
  criticidad: 'todas',
  galponId: 'todos',
}

type Props = {
  galponFijo?: number
}

function AlertasPage({ galponFijo }: Props = {}) {
  const embebida = galponFijo !== undefined
  const { alertas: todas, cargando, actualizandoId, error, recargar, aceptar, cerrar, escalar } = useAlertas()
  // El operario solo ve sus galpones asignados: los textos hablan de «tus
  // galpones» y, si no tiene ninguno, se le dice en vez de un «Todo en orden»
  // engañoso (auditoría QA 2026-10-30, HALL-03).
  const esOperario = getRol() === ROL_OPERARIO
  const asignacion = useGalponesAsignados(esOperario && !embebida)
  // Quien trabaja la bodega de su granja ve aquí lo que falta reponer. El
  // administrador no: vería la bodega de todas las organizaciones.
  const rol = getRol()
  const stock = useStockBajo(!embebida && (esOperario || rol === ROL_PROPIETARIO))
  const alertas = useMemo(
    () => (embebida ? todas.filter((alerta) => alerta.galpon_id === galponFijo) : todas),
    [embebida, galponFijo, todas],
  )
  const [filtros, setFiltros] = useState<FiltrosAlertasModel>(FILTROS_INICIALES)
  const [seleccionada, setSeleccionada] = useState<Alerta | null>(null)
  const resumen = useMemo(() => obtenerResumenAlertas(alertas), [alertas])
  const alertasFiltradas = useMemo(() => filtrarAlertas(alertas, filtros), [alertas, filtros])

  const galponesConAlertas = useMemo(
    () => [...new Map(alertas.map((alerta) => [alerta.galpon_id, alerta.galpon])).values()],
    [alertas],
  )

  const activas = resumen.abiertas + resumen.enProceso
  const cerradas = alertas.filter((alerta) => alerta.estado === 'cerrada').length
  const totalCriticas = alertas.filter((alerta) => esCriticidadAlta(alerta.criticidad)).length
  const totalMedias = alertas.filter((alerta) => normalizarCriticidad(alerta.criticidad) === 'media').length
  const totalBajas = alertas.filter((alerta) => normalizarCriticidad(alerta.criticidad) === 'baja').length
  const resolucionPct = resumen.total > 0 ? Math.round((cerradas / resumen.total) * 100) : 100
  const tonoEstado = resumen.criticas > 0 ? 'peligro' : resumen.abiertas > 0 ? 'alerta' : 'ok'
  const etiquetaHero = resumen.criticas > 0
    ? 'Atención urgente'
    : resumen.abiertas > 0
      ? 'Alertas pendientes'
      : 'Todo en orden'
  const filtrando = filtros.estado !== 'todas' || filtros.criticidad !== 'todas' || filtros.galponId !== 'todos'

  async function atender(id: number) {
    const seAtendio = await aceptar(id)
    if (seAtendio) {
      setSeleccionada((actual) => (
        actual?.id === id ? { ...actual, estado: 'en_proceso' } : actual
      ))
    }
  }

  function seleccionarResumen(tarjeta: TarjetaResumenAlerta) {
    setFiltros((actual) => {
      if (tarjeta === 'todas') return { ...actual, estado: 'todas', criticidad: 'todas' }
      if (tarjeta === 'abierta') return { ...actual, estado: 'abierta', criticidad: 'todas' }
      if (tarjeta === 'en_proceso') return { ...actual, estado: 'en_proceso', criticidad: 'todas' }
      return { ...actual, estado: 'activas', criticidad: 'alta' }
    })
  }

  const pildorasEstado = [
    { id: 'todas', etiqueta: 'Todas', conteo: resumen.total },
    ...(!embebida ? [{ id: 'activas' as const, etiqueta: 'Activas', conteo: activas }] : []),
    { id: 'abierta', etiqueta: 'Por atender', conteo: resumen.abiertas },
    { id: 'en_proceso', etiqueta: 'En atención', conteo: resumen.enProceso },
    { id: 'cerrada', etiqueta: 'Cerradas', conteo: cerradas },
  ] as const

  const vistaPildoras = (
    <div className="ale-pildoras" role="group" aria-label="Filtrar alertas por estado">
      {pildorasEstado.map((opcion) => {
        const activa = filtros.estado === opcion.id && filtros.criticidad === 'todas'
        return (
          <button
            key={opcion.id}
            type="button"
            className={`ale-pildora${activa ? ' is-activa' : ''}`}
            aria-pressed={activa}
            onClick={() => setFiltros((actual) => ({ ...actual, estado: opcion.id, criticidad: 'todas' }))}
          >
            <span>{opcion.etiqueta}</span>
            <span className="ale-pildora-conteo">{opcion.conteo}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={embebida ? 'ale-page ale-page--embebida' : 'page-container ale-page adm-page'}>
      {!embebida && (
        <CabeceraAdmin
          eyebrow="Monitoreo · Alertas"
          titulo="Alertas"
          subtitulo={esOperario
            ? 'Revisa, atiende y deja registrada cada situación que detecten los sensores de tus galpones.'
            : 'Revisa, atiende y deja registrada cada situación detectada por los sensores.'}
          acciones={resumen.criticas > 0 ? (
            <button
              type="button"
              className="adm-btn adm-btn--secundario ale-cab-urgente"
              onClick={() => seleccionarResumen('criticas')}
            >
              <IcAlert size={15} aria-hidden="true" />
              Ver {resumen.criticas} {resumen.criticas === 1 ? 'crítica' : 'críticas'}
            </button>
          ) : undefined}
        />
      )}

      {asignacion.sinGalpones ? (
        <SinGalponesAsignados queVerias="las alertas que detecten los sensores de tus galpones" />
      ) : embebida ? (
        <>
          {error && (
            <div className="ale-error adm-alerta" role="alert">
              {error}
              <button type="button" onClick={() => void recargar()}>Reintentar</button>
            </div>
          )}
          <BannerAlertaCritica alertas={alertas} onAbrir={setSeleccionada} />
          <ResumenAlertas
            resumen={resumen}
            cargando={cargando}
            alcance="En este galpón"
            filtros={filtros}
            onSeleccionar={seleccionarResumen}
          />
          {alertas.length > 0 && vistaPildoras}
          {cargando ? (
            <Cargando texto="Cargando alertas registradas…" />
          ) : (
            <ListaAlertas
              alertas={alertasFiltradas}
              hayAlertas={alertas.length > 0}
              embebida
              onLimpiarFiltros={() => setFiltros(FILTROS_INICIALES)}
              actualizandoId={actualizandoId}
              onAtender={(id) => void atender(id)}
              onVerDetalle={setSeleccionada}
            />
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="ale-error adm-alerta" role="alert">
              {error}
              <button type="button" onClick={() => void recargar()}>Reintentar</button>
            </div>
          )}

          <div className="ale-expediente">
            <aside className="ale-ficha" aria-label="Centro de alertas y filtros">
              <header className="ale-ficha-hero">
                <div className="ale-ficha-hero-top">
                  <span className="ale-ficha-pill">
                    <span className={`ale-ficha-dot ale-ficha-dot--${tonoEstado}`} aria-hidden="true" />
                    {etiquetaHero}
                  </span>
                  <span className="ale-ficha-dia">{activas} activas</span>
                </div>

                <h2 className="ale-ficha-codigo">Centro de alertas</h2>
                <p className="ale-ficha-ubicacion">
                  <IcBell size={14} aria-hidden="true" />
                  <span>{esOperario ? 'Tus galpones asignados' : 'Todos los galpones'}</span>
                </p>

                <div className="ale-ficha-tags">
                  <span className="ale-ficha-tag">
                    <IcBarn size={12} aria-hidden="true" />
                    {galponesConAlertas.length} {galponesConAlertas.length === 1 ? 'galpón con registro' : 'galpones con registros'}
                  </span>
                  {stock.porReponer.length > 0 && (
                    <span className="ale-ficha-tag">
                      {stock.porReponer.length} insumos por reponer
                    </span>
                  )}
                </div>
              </header>

              <div className="ale-ficha-cuerpo">
                <div className="ale-ficha-bloque">
                  <span className="ale-ficha-seccion-titulo">Filtros rápidos</span>

                  <label className="ale-campo">
                    <span>Prioridad</span>
                    <span className="ale-selector">
                      <select
                        value={filtros.criticidad}
                        onChange={(event) => setFiltros({ ...filtros, criticidad: event.target.value as FiltrosAlertasModel['criticidad'] })}
                      >
                        <option value="todas">Todas las prioridades</option>
                        <option value="alta">Crítica</option>
                        <option value="media">Atención</option>
                        <option value="baja">Informativa</option>
                      </select>
                      <IcChevronDown size={15} aria-hidden="true" />
                    </span>
                  </label>

                  <label className="ale-campo">
                    <span>Galpón</span>
                    <span className="ale-selector">
                      <select
                        value={filtros.galponId}
                        onChange={(event) => setFiltros({ ...filtros, galponId: event.target.value })}
                      >
                        <option value="todos">{esOperario ? 'Todos mis galpones' : 'Todos los galpones'}</option>
                        {galponesConAlertas.map((galpon) => (
                          <option key={galpon.id} value={galpon.id}>
                            {galpon.nombre} · {galpon.granja.nombre}
                          </option>
                        ))}
                      </select>
                      <IcChevronDown size={15} aria-hidden="true" />
                    </span>
                  </label>

                  {filtrando && (
                    <button
                      type="button"
                      className="ale-limpiar-ficha"
                      onClick={() => setFiltros(FILTROS_INICIALES)}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="ale-ficha-bloque">
                  <span className="ale-ficha-seccion-titulo">Tasa de resolución</span>
                  <div className="ale-progreso">
                    <div className="ale-progreso-cab">
                      <span>Alertas cerradas</span>
                      <strong className={`ale-progreso-val ale-progreso-val--${tonoEstado}`}>
                        {resolucionPct}%
                      </strong>
                    </div>
                    <div className="ale-barra" aria-hidden="true">
                      <span
                        className={`ale-barra-fill ale-barra-fill--${tonoEstado}`}
                        style={{ width: `${resumen.total > 0 ? Math.max(4, resolucionPct) : 100}%` }}
                      />
                    </div>
                    <small className="ale-progreso-pie">
                      {cerradas} cerradas · {activas} activas de {resumen.total}
                    </small>
                  </div>
                </div>

                <div className="ale-ficha-bloque">
                  <span className="ale-ficha-seccion-titulo">Desglose rápido</span>
                  <div className="ale-ficha-contadores">
                    <button
                      type="button"
                      className={`ale-mini-stat${filtros.criticidad === 'alta' ? ' is-activo' : ''}${totalCriticas > 0 ? ' is-alerta' : ''}`}
                      onClick={() => setFiltros((actual) => ({ ...actual, estado: 'todas', criticidad: 'alta' }))}
                    >
                      <span>Críticas</span>
                      <strong>{totalCriticas}</strong>
                    </button>
                    <button
                      type="button"
                      className={`ale-mini-stat${filtros.criticidad === 'media' ? ' is-activo' : ''}`}
                      onClick={() => setFiltros((actual) => ({ ...actual, estado: 'todas', criticidad: 'media' }))}
                    >
                      <span>Atención</span>
                      <strong>{totalMedias}</strong>
                    </button>
                    <button
                      type="button"
                      className={`ale-mini-stat${filtros.criticidad === 'baja' ? ' is-activo' : ''}`}
                      onClick={() => setFiltros((actual) => ({ ...actual, estado: 'todas', criticidad: 'baja' }))}
                    >
                      <span>Informativas</span>
                      <strong>{totalBajas}</strong>
                    </button>
                    <button
                      type="button"
                      className={`ale-mini-stat${filtros.estado === 'cerrada' && filtros.criticidad === 'todas' ? ' is-activo' : ''}`}
                      onClick={() => setFiltros((actual) => ({ ...actual, estado: 'cerrada', criticidad: 'todas' }))}
                    >
                      <span>Cerradas</span>
                      <strong>{cerradas}</strong>
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <main className="ale-main">
              <BannerAlertaCritica alertas={alertas} onAbrir={setSeleccionada} />

              <ResumenAlertas
                resumen={resumen}
                cargando={cargando}
                alcance={esOperario ? 'En tus galpones' : 'En todos los galpones'}
                filtros={filtros}
                onSeleccionar={seleccionarResumen}
              />

              {vistaPildoras}

              <AvisoStockBajo insumos={stock.porReponer} />

              {cargando ? (
                <Cargando texto="Cargando alertas registradas…" />
              ) : (
                <ListaAlertas
                  alertas={alertasFiltradas}
                  hayAlertas={alertas.length > 0}
                  onLimpiarFiltros={() => setFiltros(FILTROS_INICIALES)}
                  actualizandoId={actualizandoId}
                  onAtender={(id) => void atender(id)}
                  onVerDetalle={setSeleccionada}
                />
              )}
            </main>
          </div>
        </>
      )}

      <PanelAlerta
        alerta={seleccionada}
        cerrando={actualizandoId === seleccionada?.id}
        onCerrar={cerrar}
        onEscalar={escalar}
        onSalir={() => setSeleccionada(null)}
      />
    </div>
  )
}

export default AlertasPage
