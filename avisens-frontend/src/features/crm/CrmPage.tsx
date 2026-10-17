import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import {
  IcChevronDown,
  IcChevronRight,
  IcDoc,
  IcSearch,
} from '@shared/ui/icons/icons'
import EstadoVacioAnimado from '@shared/ui/Animacion/EstadoVacioAnimado'
import { useProspectos } from './hooks/useProspectos'
import { payloadDeConversion } from './model/conversion'
import {
  organizarBandeja,
  resumirBandeja,
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
import './CrmPage.css'
import './Prospectos.css'

const VISTAS: Array<{ valor: VistaBandeja; etiqueta: string }> = [
  { valor: 'prioridad', etiqueta: 'Prioridad' },
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'convertidos', etiqueta: 'Convertidos' },
  { valor: 'descartados', etiqueta: 'Descartados' },
]

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
      <IcChevronDown size={17} aria-hidden="true" />
    </label>
  )
}

function Indicador({ valor, etiqueta, nota, tono, orden, children }: {
  valor: number | string | null
  etiqueta: string
  nota: string
  tono?: 'alerta'
  orden: number
  children?: ReactNode
}) {
  return (
    <li className={`pros-indicador org-aparece${tono ? ` pros-indicador--${tono}` : ''}`} style={{ '--orden': orden } as CSSProperties}>
      <span className="pros-indicador-label">{etiqueta}</span>
      <strong className="pros-indicador-valor">{valor === null ? <span className="pros-esqueleto-num org-brilla" aria-hidden="true" /> : valor}</strong>
      {children}
      <small>{nota}</small>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className={`pros-item${seleccionado ? ' is-seleccionado' : ''}`}
    >
      <label className={`pros-tarjeta pros-tarjeta--${prioridad.grupo}`}>
        <input type="radio" name="prospecto" className="sr-only" checked={seleccionado} onChange={onSeleccionar} />
        <span className={`pros-avatar pros-avatar--${prospecto.etapa}`} aria-hidden="true">{iniciales(prospecto.nombre)}</span>
        <span className="pros-tarjeta-info">
          <span className="pros-tarjeta-nombre">{prospecto.nombre}</span>
          <span className="pros-tarjeta-meta">
            <ChipTemperatura etapa={prospecto.etapa} />
            <span>{lugar || 'Sin datos de la granja'}</span>
          </span>
          <span className="pros-tarjeta-motivo">{prioridad.motivo}</span>
        </span>
        <span className="pros-tarjeta-lado">
          <span className="pros-tarjeta-puntaje" title="Puntaje del chatbot">{prospecto.puntaje}<small>/12</small></span>
          {prospecto.asesorId === null && prospecto.etapa !== 'cerrado' && prospecto.etapa !== 'descartado'
            ? <span className="pros-sin-asesor">Sin asesor</span>
            : <IcChevronRight size={16} aria-hidden="true" />}
        </span>
      </label>
    </motion.li>
  )
}

function CrmPage() {
  const { prospectos, asesores, cargando, asignandoId, exportando, error, recargar, asignar, exportar, convertir, descartar, eliminar } = useProspectos()
  const [aConvertir, setAConvertir] = useState<ProspectoDetalle | null>(null)
  const [aEliminar, setAEliminar] = useState<ProspectoVista | null>(null)
  const [parametros, setParametros] = useSearchParams()
  const [vista, setVista] = useState<VistaBandeja>('prioridad')
  const [texto, setTexto] = useState('')
  const [canal, setCanal] = useState<FiltroCanal>('todos')
  const [temperatura, setTemperatura] = useState<FiltroTemperatura>('todas')
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(reloj)
  }, [])

  const resumen = useMemo(() => resumirBandeja(prospectos, ahora), [prospectos, ahora])
  const secciones = useMemo(
    () => organizarBandeja(prospectos, { vista, texto, canal, temperatura }, ahora),
    [prospectos, vista, texto, canal, temperatura, ahora],
  )
  const items = secciones.flatMap((seccion) => seccion.items)
  const idPedido = Number(parametros.get('prospecto'))
  const seleccionado = items.find((item) => item.prospecto.id === idPedido) ?? items[0] ?? null
  const listo = !cargando && !error
  const hayFiltros = texto.trim() !== '' || canal !== 'todos' || temperatura !== 'todas'
  const totalTemperaturas = resumen.porTemperatura.caliente + resumen.porTemperatura.tibio + resumen.porTemperatura.frio

  function seleccionar(id: number) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('prospecto', String(id))
      return siguientes
    }, { replace: true })
    if (window.matchMedia('(max-width: 64rem)').matches) {
      requestAnimationFrame(() => document.querySelector('.pros-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function limpiarFiltros() {
    setTexto('')
    setCanal('todos')
    setTemperatura('todas')
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
            <IcDoc size={17} aria-hidden="true" />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </header>

        <ul className="pros-indicadores" aria-label="Resumen comercial">
          <Indicador
            orden={1}
            valor={listo ? resumen.paraAtender : null}
            etiqueta="Para atender hoy"
            nota={!listo ? 'Calculando…' : resumen.vencidos > 0 ? `${plural(resumen.vencidos, 'vencido', 'vencidos')}` : 'Nada vencido'}
            tono={resumen.vencidos > 0 ? 'alerta' : undefined}
          />
          <Indicador orden={2} valor={listo ? resumen.activos : null} etiqueta="Activos" nota={`${resumen.porTemperatura.caliente} alto · ${resumen.porTemperatura.tibio} medio · ${resumen.porTemperatura.frio} bajo`}>
            <span className={`pros-embudo${totalTemperaturas ? '' : ' is-vacio'}`} aria-hidden="true">
              {(['caliente', 'tibio', 'frio'] as const).map((etapa) => (
                <span key={etapa} className={`pros-embudo-${etapa}`} style={{ flexGrow: totalTemperaturas ? resumen.porTemperatura[etapa] : 1 }} />
              ))}
            </span>
          </Indicador>
          <Indicador orden={3} valor={listo ? resumen.sinAsesor : null} etiqueta="Sin asesor" nota="Esperan que alguien los tome" />
          <Indicador orden={4} valor={listo ? resumen.convertidos : null} etiqueta="Convertidos" nota={`${resumen.conversionPct}% de conversión`} />
        </ul>

        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}

        <Tabs.Root value={vista} onValueChange={(valor) => setVista(valor as VistaBandeja)} className="pros-tabs">
          <div className="pros-herramientas org-aparece" style={{ '--orden': 3 } as CSSProperties}>
            <Tabs.List className="pros-vistas" aria-label="Vista de la bandeja">
              {VISTAS.map((opcion) => (
                <Tabs.Trigger key={opcion.valor} value={opcion.valor} className="pros-vista">
                  {opcion.etiqueta}
                  <span>{resumen.porVista[opcion.valor]}</span>
                  {vista === opcion.valor && <motion.span layoutId="pros-vista-activa" className="pros-vista-fondo" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <label className="pros-buscador">
              <span className="sr-only">Buscar prospecto</span>
              <IcSearch size={17} aria-hidden="true" />
              <input type="search" value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Buscar por nombre, granja, municipio o contacto…" autoComplete="off" />
            </label>
            <Desplegable valor={temperatura} opciones={TEMPERATURAS} etiqueta="Filtrar por interés" onCambiar={setTemperatura} />
            <Desplegable valor={canal} opciones={CANALES} etiqueta="Filtrar por origen" onCambiar={setCanal} />
          </div>

          <div className="pros-cuerpo">
            <Tabs.Content value={vista} className="pros-bandeja" forceMount>
              {cargando ? (
                <ul className="pros-lista" aria-hidden="true">
                  {[0, 1, 2, 3].map((indice) => <li key={indice} className="pros-tarjeta-esqueleto org-brilla" />)}
                </ul>
              ) : error ? null : prospectos.length === 0 ? (
                <EstadoVacioAnimado
                  className="pros-vacio"
                  animacion="caja-vacia"
                  titulo="Todavía no hay prospectos"
                  texto="Cuando alguien converse con el chatbot y dé su consentimiento, aparecerá aquí."
                />
              ) : secciones.length === 0 ? (
                <EstadoVacioAnimado
                  className="pros-vacio"
                  animacion={hayFiltros ? 'sin-resultados' : 'bandeja-vacia'}
                  titulo={hayFiltros ? 'Sin coincidencias' : vista === 'prioridad' ? 'Bandeja al día' : 'Nada por aquí'}
                  texto={hayFiltros ? 'Ningún prospecto coincide con la búsqueda o los filtros.' : vista === 'prioridad' ? 'No hay prospectos activos por atender.' : 'Esta vista no tiene prospectos todavía.'}
                  accion={hayFiltros ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button> : undefined}
                />
              ) : (
                <LayoutGroup>
                  <div role="radiogroup" aria-label="Prospectos">
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
                                onSeleccionar={() => seleccionar(item.prospecto.id)}
                              />
                            ))}
                          </AnimatePresence>
                        </ul>
                      </section>
                    ))}
                  </div>
                </LayoutGroup>
              )}
            </Tabs.Content>

            <PanelProspecto
              prospecto={seleccionado?.prospecto ?? null}
              prioridad={seleccionado?.prioridad ?? null}
              asesores={asesores}
              asignando={asignandoId === seleccionado?.prospecto.id}
              onAsignar={(asesorId) => { if (seleccionado) void asignar(seleccionado.prospecto.id, asesorId) }}
              onConvertir={setAConvertir}
              onDescartar={(motivo) => (seleccionado ? descartar(seleccionado.prospecto.id, motivo) : Promise.resolve(false))}
              onEliminar={() => { if (seleccionado) setAEliminar(seleccionado.prospecto) }}
            />
          </div>
        </Tabs.Root>

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
