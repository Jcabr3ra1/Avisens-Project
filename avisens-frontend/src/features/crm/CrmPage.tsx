import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import {
  IcAlert,
  IcCheck,
  IcChevronDown,
  IcChevronRight,
  IcClose,
  IcDoc,
  IcFlame,
  IcSearch,
  IcUsers,
} from '@shared/ui/icons/icons'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { useProspectos } from './hooks/useProspectos'
import { payloadDeConversion } from './model/conversion'
import {
  organizarBandeja,
  resumirBandeja,
  siguienteProspectoId,
  type FiltroCanal,
  type FiltroTemperatura,
  type ItemBandeja,
  type VistaBandeja,
} from './model/bandeja'
import { iniciales } from './model/formato'
import ChipTemperatura from './components/ChipTemperatura'
import ConversionGuiada from './components/ConversionGuiada'
import PanelProspecto from './components/PanelProspecto'
import EliminarProspecto from './components/EliminarProspecto'
import type { ProspectoVista } from './model/prospectoVista'
import type { ProspectoDetalle } from './api/prospectos'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './Prospectos.css'

const TEMPERATURAS: Array<{ valor: FiltroTemperatura; etiqueta: string }> = [
  { valor: 'todas', etiqueta: 'Interés: todos' },
  { valor: 'caliente', etiqueta: 'Interés: alto' },
  { valor: 'tibio', etiqueta: 'Interés: medio' },
  { valor: 'frio', etiqueta: 'Interés: bajo' },
]

const CANALES: Array<{ valor: FiltroCanal; etiqueta: string }> = [
  { valor: 'todos', etiqueta: 'Origen: todos' },
  { valor: 'web', etiqueta: 'Origen: web' },
  { valor: 'whatsapp', etiqueta: 'Origen: WhatsApp' },
]

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`
}

function Desplegable<T extends string>({ valor, opciones, etiqueta, onCambiar }: {
  valor: T
  opciones: Array<{ valor: T; etiqueta: string }>
  etiqueta: string
  onCambiar: (valor: T) => void
}) {
  return (
    <label className="pros-desplegable">
      <span className="sr-only">{etiqueta}</span>
      <select value={valor} onChange={(evento) => onCambiar(evento.target.value as T)}>
        {opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </select>
      <IcChevronDown size={16} aria-hidden="true" />
    </label>
  )
}

function IndicadorFiltro({ valor, etiqueta, nota, activo, tono = 'primario', icono, orden, onClick, children }: {
  valor: number | string | null
  etiqueta: string
  nota: string
  activo: boolean
  tono?: 'primario' | 'ok' | 'info' | 'alerta' | 'peligro'
  icono: ReactNode
  orden: number
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <li className="org-aparece" style={{ '--orden': orden } as CSSProperties}>
      <button
        type="button"
        className={`adm-kpi adm-kpi--${tono}${activo ? ' is-activo' : ''}`}
        aria-pressed={activo}
        onClick={onClick}
      >
        <span className="adm-kpi-cab">
          <span className="adm-kpi-etiqueta">{etiqueta}</span>
          <span className="adm-kpi-icono" aria-hidden="true">{icono}</span>
        </span>
        <strong className="adm-kpi-valor">
          {valor === null ? <span className="pros-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
        </strong>
        {children}
        <span className="adm-kpi-nota">{nota}</span>
      </button>
    </li>
  )
}

function TarjetaProspecto({ item, seleccionado, onSeleccionar }: {
  item: ItemBandeja
  seleccionado: boolean
  onSeleccionar: () => void
}) {
  const { prospecto, prioridad } = item
  const lugar = [prospecto.granja, prospecto.municipio].filter(Boolean).join(' · ')
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`pros-item${seleccionado ? ' is-seleccionado' : ''}`}
      role="option"
      aria-selected={seleccionado}
    >
      <button
        type="button"
        className={`pros-tarjeta pros-tarjeta--${prioridad.grupo}`}
        onClick={onSeleccionar}
      >
        <span className={`pros-avatar pros-avatar--${prospecto.etapa}`} aria-hidden="true">
          {iniciales(prospecto.nombre)}
        </span>

        <span className="pros-tarjeta-info">
          <span className="pros-tarjeta-cabecera">
            <span className="pros-tarjeta-nombre">{prospecto.nombre}</span>
            <ChipTemperatura etapa={prospecto.etapa} />
          </span>
          <span className="pros-tarjeta-meta">
            <span>{lugar || 'Sin datos de granja'}</span>
            <span aria-hidden="true">·</span>
            <span className="pros-tarjeta-motivo">{prioridad.motivo}</span>
          </span>
        </span>

        <span className="pros-tarjeta-lado">
          <span className="pros-tarjeta-puntaje" title="Puntaje del chatbot">
            {prospecto.puntaje}<small>/12</small>
          </span>
          {prospecto.asesorId === null && prospecto.etapa !== 'cerrado' && prospecto.etapa !== 'descartado' ? (
            <span className="pros-sin-asesor">Sin asesor</span>
          ) : (
            <IcChevronRight size={16} className="pros-tarjeta-flecha" aria-hidden="true" />
          )}
        </span>
      </button>
    </motion.li>
  )
}

function CrmPage() {
  const {
    prospectos,
    asesores,
    cargando,
    asignandoId,
    exportando,
    error,
    recargar,
    asignar,
    exportar,
    convertir,
    descartar,
    eliminar,
  } = useProspectos()
  useRefetchOnFocus(recargar)

  const [aConvertir, setAConvertir] = useState<ProspectoDetalle | null>(null)
  const [aEliminar, setAEliminar] = useState<ProspectoVista | null>(null)
  const [parametros, setParametros] = useSearchParams()
  const [vista, setVista] = useState<VistaBandeja>('prioridad')
  const [soloSinAsesor, setSoloSinAsesor] = useState(false)
  const [texto, setTexto] = useState('')
  const [canal, setCanal] = useState<FiltroCanal>('todos')
  const [temperatura, setTemperatura] = useState<FiltroTemperatura>('todas')
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false)
  const [ahora, setAhora] = useState(() => new Date())
  const buscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(reloj)
  }, [])

  useEffect(() => {
    function atajoBuscar(evento: globalThis.KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement) return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', atajoBuscar)
    return () => window.removeEventListener('keydown', atajoBuscar)
  }, [])

  const resumen = useMemo(() => resumirBandeja(prospectos, ahora), [prospectos, ahora])
  const secciones = useMemo(
    () => organizarBandeja(prospectos, { vista, texto, canal, temperatura, soloSinAsesor }, ahora),
    [prospectos, vista, texto, canal, temperatura, soloSinAsesor, ahora],
  )
  const items = useMemo(() => secciones.flatMap((seccion) => seccion.items), [secciones])
  const idsVisibles = useMemo(() => items.map((item) => item.prospecto.id), [items])
  const idPedido = Number(parametros.get('prospecto'))
  const seleccionado = items.find((item) => item.prospecto.id === idPedido) ?? items[0] ?? null
  const listo = !cargando && !error
  const esVistaActiva = vista === 'prioridad' || vista === 'activos'
  const hayFiltros = texto.trim() !== '' || canal !== 'todos' || temperatura !== 'todas' || soloSinAsesor || vista === 'descartados'
  const totalTemperaturas = resumen.porTemperatura.caliente + resumen.porTemperatura.tibio + resumen.porTemperatura.frio

  function seleccionar(id: number, abrirEnMovil = false) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('prospecto', String(id))
      return siguientes
    }, { replace: true })
    if (abrirEnMovil && window.matchMedia('(max-width: 64rem)').matches) {
      setPanelMovilAbierto(true)
    }
  }

  function elegirVista(nuevaVista: VistaBandeja, sinAsesor = false) {
    setVista(nuevaVista)
    setSoloSinAsesor(sinAsesor)
    if (nuevaVista === 'convertidos' || nuevaVista === 'descartados') {
      setTemperatura('todas')
    }
  }

  function limpiarFiltros() {
    setTexto('')
    setCanal('todos')
    setTemperatura('todas')
    setSoloSinAsesor(false)
    if (vista === 'descartados') setVista('prioridad')
  }

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguienteId = siguienteProspectoId(idsVisibles, seleccionado?.prospecto.id ?? null, evento.key)
    if (siguienteId === null) return
    evento.preventDefault()
    seleccionar(siguienteId, false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="page-container adm-page pros">
        <header className="pros-cabecera org-aparece">
          <div>
            <span className="adm-eyebrow">
              <span className="adm-eyebrow-punto" aria-hidden="true" />
              Plataforma · Comercial
            </span>
            <h1>Prospectos</h1>
            <p>Personas que llegaron por el chatbot. Atiende primero a quien lo necesita.</p>
          </div>
          <button type="button" className="pros-boton-cabecera" onClick={() => void exportar()} disabled={exportando || !listo}>
            <IcDoc size={16} aria-hidden="true" />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </header>

        <ul className="adm-kpis" aria-label="Filtros rápidos comerciales">
          <IndicadorFiltro
            orden={1}
            valor={listo ? resumen.paraAtender : null}
            etiqueta="Para atender"
            nota={!listo ? 'Calculando…' : resumen.vencidos > 0 ? plural(resumen.vencidos, 'vencido', 'vencidos') : 'Al día'}
            activo={vista === 'prioridad' && !soloSinAsesor}
            tono={resumen.vencidos > 0 ? 'peligro' : 'primario'}
            icono={resumen.vencidos > 0 ? <IcAlert size={15} /> : <IcFlame size={15} />}
            onClick={() => elegirVista('prioridad', false)}
          />
          <IndicadorFiltro
            orden={2}
            valor={listo ? resumen.activos : null}
            etiqueta="Activos"
            nota={`${resumen.porTemperatura.caliente} alto · ${resumen.porTemperatura.tibio} medio · ${resumen.porTemperatura.frio} bajo`}
            activo={vista === 'activos' && !soloSinAsesor}
            tono="info"
            icono={<IcUsers size={15} />}
            onClick={() => elegirVista('activos', false)}
          >
            <span className={`pros-embudo${totalTemperaturas ? '' : ' is-vacio'}`} aria-hidden="true">
              {(['caliente', 'tibio', 'frio'] as const).map((etapa) => (
                <span key={etapa} className={`pros-embudo-${etapa}`} style={{ flexGrow: totalTemperaturas ? resumen.porTemperatura[etapa] : 1 }} />
              ))}
            </span>
          </IndicadorFiltro>
          <IndicadorFiltro
            orden={3}
            valor={listo ? resumen.sinAsesor : null}
            etiqueta="Sin asesor"
            nota="Esperan asignación"
            activo={soloSinAsesor && vista === 'prioridad'}
            tono={resumen.sinAsesor > 0 ? 'alerta' : 'ok'}
            icono={<IcAlert size={15} />}
            onClick={() => elegirVista('prioridad', !soloSinAsesor)}
          />
          <IndicadorFiltro
            orden={4}
            valor={listo ? resumen.convertidos : null}
            etiqueta="Convertidos"
            nota={`${resumen.conversionPct}% de conversión`}
            activo={vista === 'convertidos'}
            tono="ok"
            icono={<IcCheck size={15} />}
            onClick={() => elegirVista('convertidos', false)}
          />
        </ul>

        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}

        <div className="pros-herramientas org-aparece" style={{ '--orden': 2 } as CSSProperties}>
          <label className="pros-buscador">
            <span className="sr-only">Buscar prospecto</span>
            <IcSearch size={16} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Buscar por nombre, granja, municipio o contacto…"
              autoComplete="off"
            />
            {texto ? (
              <button
                type="button"
                className="pros-limpiar-busqueda"
                onClick={() => setTexto('')}
                aria-label="Limpiar búsqueda"
              >
                <IcClose size={13} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>

          <div className="pros-controles">
            {esVistaActiva && (
              <Desplegable valor={temperatura} opciones={TEMPERATURAS} etiqueta="Filtrar por interés" onCambiar={setTemperatura} />
            )}
            <Desplegable valor={canal} opciones={CANALES} etiqueta="Filtrar por origen" onCambiar={setCanal} />

            <button
              type="button"
              className={`pros-descartados-pill${vista === 'descartados' ? ' is-activo' : ''}`}
              aria-pressed={vista === 'descartados'}
              onClick={() => elegirVista(vista === 'descartados' ? 'prioridad' : 'descartados', false)}
            >
              Descartados
              <span>{resumen.porVista.descartados}</span>
            </button>

            {hayFiltros && (
              <button type="button" className="pros-filtro-limpiar" onClick={limpiarFiltros}>
                Limpiar <IcClose size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="pros-cuerpo">
          <div className="pros-bandeja">
            {cargando ? (
              <ul className="pros-lista" aria-hidden="true">
                {[0, 1, 2, 3].map((indice) => <li key={indice} className="pros-tarjeta-esqueleto org-brilla" />)}
              </ul>
            ) : error ? null : prospectos.length === 0 ? (
              <EstadoVacio
                className="pros-vacio"
                titulo="Todavía no hay prospectos"
                texto="Cuando alguien converse con el chatbot y dé su consentimiento, aparecerá aquí."
              />
            ) : secciones.length === 0 ? (
              <EstadoVacio
                className="pros-vacio"
                titulo={hayFiltros ? 'Sin coincidencias' : vista === 'prioridad' ? 'Bandeja al día' : 'Nada por aquí'}
                texto={hayFiltros ? 'Ningún prospecto coincide con la búsqueda o los filtros.' : vista === 'prioridad' ? 'No hay prospectos activos por atender.' : 'Esta vista no tiene prospectos todavía.'}
                accion={hayFiltros ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button> : undefined}
              />
            ) : (
              <LayoutGroup>
                <div
                  role="listbox"
                  aria-label="Lista de prospectos"
                  tabIndex={0}
                  className="pros-listbox"
                  onKeyDown={manejarTecladoLista}
                >
                  {secciones.map((seccion) => (
                    <section key={seccion.grupo} className={`pros-seccion-bandeja pros-seccion-bandeja--${seccion.grupo}`} aria-labelledby={`pros-grupo-${seccion.grupo}`}>
                      <header>
                        <h2 id={`pros-grupo-${seccion.grupo}`}>{seccion.titulo}<span>{seccion.items.length}</span></h2>
                        <p>{seccion.descripcion}</p>
                      </header>
                      <ul className="pros-lista">
                        <AnimatePresence initial={false}>
                          {seccion.items.map((item) => (
                            <TarjetaProspecto
                              key={item.prospecto.id}
                              item={item}
                              seleccionado={item.prospecto.id === seleccionado?.prospecto.id}
                              onSeleccionar={() => seleccionar(item.prospecto.id, true)}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  ))}
                </div>
              </LayoutGroup>
            )}
          </div>

          <PanelProspecto
            prospecto={seleccionado?.prospecto ?? null}
            prioridad={seleccionado?.prioridad ?? null}
            asesores={asesores}
            asignando={asignandoId === seleccionado?.prospecto.id}
            abiertoMovil={panelMovilAbierto && seleccionado !== null}
            onCerrarMovil={() => setPanelMovilAbierto(false)}
            onAsignar={(asesorId) => { if (seleccionado) void asignar(seleccionado.prospecto.id, asesorId) }}
            onConvertir={setAConvertir}
            onDescartar={(motivo) => (seleccionado ? descartar(seleccionado.prospecto.id, motivo) : Promise.resolve(false))}
            onEliminar={() => { if (seleccionado) setAEliminar(seleccionado.prospecto) }}
          />
        </div>

        {aConvertir && (
          <ConversionGuiada
            prospecto={aConvertir}
            onConvertir={(form) => convertir(aConvertir.id, payloadDeConversion(form))}
            onCerrar={() => setAConvertir(null)}
          />
        )}
        {aEliminar && (
          <EliminarProspecto
            nombre={aEliminar.nombre}
            onEliminar={(confirmacion) => eliminar(aEliminar.id, confirmacion)}
            onEliminado={() => {
              setAEliminar(null)
              setPanelMovilAbierto(false)
              setParametros((actuales) => {
                const siguientes = new URLSearchParams(actuales)
                if (siguientes.get('prospecto') === String(aEliminar.id)) siguientes.delete('prospecto')
                return siguientes
              }, { replace: true })
            }}
            onCerrar={() => setAEliminar(null)}
          />
        )}
      </div>
    </MotionConfig>
  )
}

export default CrmPage
