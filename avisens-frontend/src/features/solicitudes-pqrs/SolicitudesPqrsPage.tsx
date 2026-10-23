import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { getUsuario } from '@shared/api'
import { IcChevronDown, IcRefresh, IcSearch } from '@shared/ui/icons/icons'
import PanelSolicitudPqrs from './components/PanelSolicitudPqrs'
import { useSolicitudesPqrs } from './hooks/useSolicitudesPqrs'
import {
  duracion,
  organizarBandeja,
  plazoDe,
  resumirBandeja,
  type VistaPqrs,
} from './model/bandejaPqrs'
import { CATEGORIAS_PQRS, ETIQUETAS_ESTADO, type SolicitudPqrs } from './model/solicitudPqrs'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './SolicitudesPqrsPage.css'

const VISTAS: Array<{ valor: VistaPqrs; etiqueta: string }> = [
  { valor: 'atender', etiqueta: 'Por atender' },
  { valor: 'mias', etiqueta: 'Mías' },
  { valor: 'resueltas', etiqueta: 'Resueltas' },
  { valor: 'todas', etiqueta: 'Todas' },
]

function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

function Indicador({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: string | number | null; nota: string; tono?: 'alerta' }) {
  return (
    <li className={`sop-indicador${tono ? ` sop-indicador--${tono}` : ''}`}>
      <span className="sop-indicador-label">{etiqueta}</span>
      <strong className="sop-indicador-valor">
        {valor === null ? <span className="sop-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
      </strong>
      <span className="sop-indicador-nota">{nota}</span>
    </li>
  )
}

function TarjetaSolicitud({ solicitud, seleccionada, ahora, onSeleccionar }: {
  solicitud: SolicitudPqrs
  seleccionada: boolean
  ahora: Date
  onSeleccionar: () => void
}) {
  const plazo = plazoDe(solicitud, ahora)
  const contacto = solicitud.prospecto.nombre || solicitud.prospecto.telefono || solicitud.prospecto.email || 'Sin contacto'
  return (
    <li className={`sop-item${seleccionada ? ' is-seleccionada' : ''}`}>
      <label className="sop-tarjeta">
        <input type="radio" name="solicitud-pqrs" className="sr-only" checked={seleccionada} onChange={onSeleccionar} />
        <span className="sop-tarjeta-info">
          <span className="sop-tarjeta-linea">
            <span className="sop-radicado">{solicitud.radicado}</span>
            <span className={`sop-categoria sop-categoria--${solicitud.categoria.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}`}>{solicitud.categoria}</span>
          </span>
          <span className="sop-tarjeta-asunto">{solicitud.asunto || 'Sin asunto'}</span>
          <span className="sop-tarjeta-contacto">{contacto}</span>
        </span>
        <span className={`sop-plazo sop-plazo--${plazo.tono}`}>{plazo.texto}</span>
        <span className="sop-responsable" title={solicitud.responsable?.nombre_completo ?? 'Sin responsable'}>
          {solicitud.responsable
            ? <span className="sop-responsable-avatar" aria-hidden="true">{iniciales(solicitud.responsable.nombre_completo)}</span>
            : <span className="sop-responsable-vacio">Sin tomar</span>}
          <span className="sr-only">{solicitud.responsable ? `A cargo de ${solicitud.responsable.nombre_completo}` : 'Sin responsable'} · {ETIQUETAS_ESTADO[solicitud.estado]}</span>
        </span>
      </label>
    </li>
  )
}

function SolicitudesPqrsPage() {
  const { solicitudes, cargando, error, ocupadaId, recargar, tomar, responder } = useSolicitudesPqrs()
  const usuarioId = getUsuario()?.id ?? null
  const [parametros, setParametros] = useSearchParams()
  const [vista, setVista] = useState<VistaPqrs>('atender')
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(reloj)
  }, [])

  const resumen = useMemo(() => resumirBandeja(solicitudes, usuarioId, ahora), [solicitudes, usuarioId, ahora])
  const secciones = useMemo(
    () => organizarBandeja(solicitudes, { vista, texto, categoria, usuarioId }, ahora),
    [solicitudes, vista, texto, categoria, usuarioId, ahora],
  )
  const items = secciones.flatMap((seccion) => seccion.items)
  const idPedido = Number(parametros.get('solicitud'))
  const seleccionada = solicitudes.find((solicitud) => solicitud.id === idPedido) ?? items[0] ?? null
  const listo = !cargando && !error
  const hayFiltros = texto.trim() !== '' || categoria !== 'todas'

  function seleccionar(id: number) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('solicitud', String(id))
      return siguientes
    }, { replace: true })
    if (window.matchMedia('(max-width: 64rem)').matches) {
      requestAnimationFrame(() => document.querySelector('.sop-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function limpiarFiltros() {
    setTexto('')
    setCategoria('todas')
  }

  return (
    <div className="page-container adm-page sop">
      <header className="sop-cabecera org-aparece">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Soporte
          </span>
          <h1 className="sop-titulo">Solicitudes PQRS</h1>
          <p className="sop-subtitulo">Peticiones, quejas y reclamos de los clientes. Atiende primero lo que está por vencer.</p>
        </div>
        <button type="button" className="sop-boton-cabecera" onClick={() => void recargar()} disabled={cargando}>
          <IcRefresh size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <ul className="sop-indicadores" aria-label="Resumen de soporte">
        <Indicador
          etiqueta="Por atender"
          valor={listo ? resumen.porAtender : null}
          nota={resumen.sinTomar === 1 ? '1 sin tomar' : `${resumen.sinTomar} sin tomar`}
        />
        <Indicador
          etiqueta="Vencidas"
          valor={listo ? resumen.vencidas : null}
          nota={resumen.porVencer ? `${resumen.porVencer} por vencer` : 'Nada por vencer'}
          tono={resumen.vencidas > 0 ? 'alerta' : undefined}
        />
        <Indicador etiqueta="Resueltas · 7 días" valor={listo ? resumen.resueltasSemana : null} nota={resumen.aTiempoPct === null ? 'Sin casos con plazo' : `${resumen.aTiempoPct} % a tiempo`} />
        <Indicador
          etiqueta="Respuesta promedio"
          valor={listo ? (resumen.respuestaPromedioHoras === null ? '—' : duracion(resumen.respuestaPromedioHoras * 3_600_000)) : null}
          nota="De radicada a resuelta"
        />
      </ul>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      <Tabs.Root value={vista} onValueChange={(valor) => setVista(valor as VistaPqrs)} className="sop-tabs">
        {!cargando && solicitudes.length > 0 && (
          <div className="sop-herramientas">
            <Tabs.List className="sop-vistas" aria-label="Vista de la bandeja">
              {VISTAS.map((opcion) => (
                <Tabs.Trigger key={opcion.valor} value={opcion.valor} className="sop-vista">
                  {opcion.etiqueta}
                  <span>{resumen.porVista[opcion.valor]}</span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <label className="sop-buscador">
              <span className="sr-only">Buscar solicitud</span>
              <IcSearch size={17} aria-hidden="true" />
              <input type="search" value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Buscar por radicado, nombre o asunto…" autoComplete="off" />
            </label>
            <label className="sop-desplegable">
              <span className="sr-only">Filtrar por categoría</span>
              <select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
                <option value="todas">Categoría: todas</option>
                {CATEGORIAS_PQRS.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select>
              <IcChevronDown size={17} aria-hidden="true" />
            </label>
          </div>
        )}

        <div className="sop-cuerpo">
          <Tabs.Content value={vista} className="sop-bandeja" forceMount>
            {cargando ? (
              <ul className="sop-lista" aria-hidden="true">
                {[0, 1, 2, 3].map((indice) => <li key={indice} className="sop-tarjeta-esqueleto org-brilla" />)}
              </ul>
            ) : error ? null : solicitudes.length === 0 ? (
              <EstadoVacio
                className="sop-vacio"
                titulo="Todavía no hay solicitudes"
                texto="Cuando un cliente radique una petición, queja o reclamo por el chatbot, aparecerá aquí con su plazo."
              />
            ) : secciones.length === 0 ? (
              <EstadoVacio
                className="sop-vacio"
                titulo={hayFiltros ? 'Sin coincidencias' : vista === 'atender' ? 'Bandeja al día' : 'Nada por aquí'}
                texto={hayFiltros ? 'Ninguna solicitud coincide con la búsqueda o la categoría.' : vista === 'atender' ? 'No hay solicitudes pendientes.' : 'Esta vista no tiene solicitudes todavía.'}
                accion={hayFiltros ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button> : undefined}
              />
            ) : (
              <div role="radiogroup" aria-label="Solicitudes PQRS">
                {secciones.map((seccion) => (
                  <section key={seccion.grupo} className={`sop-seccion sop-seccion--${seccion.grupo}`} aria-labelledby={`sop-grupo-${seccion.grupo}`}>
                    <header>
                      <h2 id={`sop-grupo-${seccion.grupo}`}>{seccion.titulo}<span>{seccion.items.length}</span></h2>
                      <p>{seccion.descripcion}</p>
                    </header>
                    <ul className="sop-lista">
                      {seccion.items.map((solicitud) => (
                        <TarjetaSolicitud
                          key={solicitud.id}
                          solicitud={solicitud}
                          ahora={ahora}
                          seleccionada={solicitud.id === seleccionada?.id}
                          onSeleccionar={() => seleccionar(solicitud.id)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Tabs.Content>

          {listo && solicitudes.length > 0 && (
            <PanelSolicitudPqrs
              key={seleccionada?.id ?? 'vacio'}
              solicitud={seleccionada}
              ahora={ahora}
              ocupada={ocupadaId !== null && ocupadaId === seleccionada?.id}
              onTomar={tomar}
              onResponder={responder}
            />
          )}
        </div>
      </Tabs.Root>
    </div>
  )
}

export default SolicitudesPqrsPage
