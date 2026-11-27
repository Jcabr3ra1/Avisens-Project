import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { getUsuario, type Usuario } from '@shared/api'
import {
  IcArrowRight,
  IcBarn,
  IcCal,
  IcChat,
  IcCheck,
  IcClose,
  IcGrid,
  IcHome,
  IcPhone,
  IcPin,
  IcPlus,
  IcSend,
  IcSidebar,
  IcTrash,
  IcUserCircle,
} from '@shared/ui/icons/icons'
import { useSolicitudesDeProspecto } from '@features/solicitudes-pqrs/hooks/useSolicitudesDeProspecto'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { useDetalleProspecto } from '../hooks/useDetalleProspecto'
import type { ProspectoDetalle } from '../api/prospectos'
import { ACCIONES, GRUPOS, type Prioridad } from '../model/bandeja'
import { esIdentidadWhatsapp, sePuedeLlamar } from '../model/contacto'
import { iniciales, metros, pesos } from '../model/formato'
import { PUNTAJE_MAXIMO, type ProspectoVista } from '../model/prospectoVista'
import ChipTemperatura from './ChipTemperatura'

type PestanaInspector = 'resumen' | 'chatbot' | 'cotizaciones'

type Props = {
  prospecto: ProspectoVista | null
  prioridad: Prioridad | null
  asesores: Usuario[]
  asignando: boolean
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onAsignar: (asesorId: number) => void
  onConvertir: (detalle: ProspectoDetalle) => void
  onDescartar: (motivo: string) => Promise<boolean>
  onEliminar: () => void
}

const MOTIVOS_PERDIDA = [
  'No le interesa por ahora',
  'El precio no le alcanza',
  'No tiene conectividad en la granja',
  'Eligió otra solución',
  'No volvió a responder',
]

const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const fechaHora = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function numeroWhatsapp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`
  if (digitos.length === 12 && digitos.startsWith('57')) return digitos
  return null
}

function Anillo({ valor }: { valor: number }) {
  const radio = 22
  const circunferencia = 2 * Math.PI * radio
  const proporcion = Math.min(Math.max(valor / PUNTAJE_MAXIMO, 0), 1)
  return (
    <div className="pros-anillo" role="img" aria-label={`Puntaje ${valor} de ${PUNTAJE_MAXIMO}`}>
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={radio} className="pros-anillo-fondo" />
        <motion.circle
          cx="28"
          cy="28"
          r={radio}
          className="pros-anillo-valor"
          strokeDasharray={circunferencia}
          initial={{ strokeDashoffset: circunferencia }}
          animate={{ strokeDashoffset: circunferencia * (1 - proporcion) }}
          transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
        />
      </svg>
      <span><strong>{valor}</strong>/{PUNTAJE_MAXIMO}</span>
    </div>
  )
}

function Dato({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: string }) {
  return (
    <div className="pros-dato">
      <span className="pros-dato-icono" aria-hidden="true">{icono}</span>
      <span>
        <small>{etiqueta}</small>
        <strong>{valor}</strong>
      </span>
    </div>
  )
}

function PanelProspecto({
  prospecto,
  prioridad,
  asesores,
  asignando,
  abiertoMovil,
  onCerrarMovil,
  onAsignar,
  onConvertir,
  onDescartar,
  onEliminar,
}: Props) {
  useEffect(() => {
    if (!abiertoMovil) return
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrarMovil()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil, onCerrarMovil])

  return (
    <>
      {abiertoMovil && (
        <div
          className="pros-panel-fondo"
          aria-hidden="true"
          onClick={onCerrarMovil}
        />
      )}
      <aside
        className={`pros-panel${abiertoMovil ? ' is-abierto-movil' : ''}`}
        aria-label="Prospecto seleccionado"
      >
        <div className="pros-panel-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Prospecto seleccionado</span>
          <button
            type="button"
            className="pros-panel-cerrar"
            onClick={onCerrarMovil}
            aria-label="Cerrar panel del prospecto"
          >
            <IcClose size={17} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {prospecto && prioridad ? (
            <motion.div
              key={prospecto.id}
              className="pros-panel-marco"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <PanelContenido
                prospecto={prospecto}
                prioridad={prioridad}
                asesores={asesores}
                asignando={asignando}
                onAsignar={onAsignar}
                onConvertir={onConvertir}
                onDescartar={onDescartar}
                onEliminar={onEliminar}
              />
            </motion.div>
          ) : (
            <motion.div key="vacio" className="pros-panel-vacio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IcUserCircle size={28} aria-hidden="true" />
              <p>Elige un prospecto de la bandeja para ver qué hacer con él.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </>
  )
}

function PanelContenido({
  prospecto,
  prioridad,
  asesores,
  asignando,
  onAsignar,
  onConvertir,
  onDescartar,
  onEliminar,
}: Omit<Props, 'prospecto' | 'prioridad' | 'abiertoMovil' | 'onCerrarMovil'> & {
  prospecto: ProspectoVista
  prioridad: Prioridad
}) {
  const [pestana, setPestana] = useState<PestanaInspector>('resumen')
  const [descartando, setDescartando] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS_PERDIDA[0])
  const [otroMotivo, setOtroMotivo] = useState('')
  const [enviandoDescarte, setEnviandoDescarte] = useState(false)
  const { detalle, cargando: cargandoDetalle } = useDetalleProspecto(prospecto.id, prospecto.ultimaActividad)
  const { cotizaciones: listaCotizaciones, cargando: cargandoCotizaciones, generando, generar } = useCotizaciones(prospecto.id)
  const { solicitudes } = useSolicitudesDeProspecto(prospecto.id)
  const cotizaciones = { lista: listaCotizaciones, cargando: cargandoCotizaciones, generando, generar }
  const pendientes = solicitudes.filter((solicitud) => solicitud.estado !== 'resuelta' && solicitud.estado !== 'cerrada')
  const solicitudesAbiertas = pendientes.length
  const respuestas = detalle?.respuestas ?? []
  const puedeConvertir = detalle !== null && !cargandoDetalle
  const activo = prospecto.etapa !== 'cerrado' && prospecto.etapa !== 'descartado'
  const accion = prospecto.accionSiguiente ? ACCIONES[prospecto.accionSiguiente] : null
  const correo = detalle?.email ?? prospecto.correo ?? ''
  const decisor = detalle?.contacto_decisor ?? prospecto.contactoDecisor
  const llamable = sePuedeLlamar(prospecto.telefono)
  const whatsapp = llamable ? numeroWhatsapp(prospecto.telefono) : null
  const yo = getUsuario()?.id
  const asesorDesconocido = prospecto.asesorId !== null && !asesores.some((asesor) => asesor.id === prospecto.asesorId)
  const ubicacion = [prospecto.municipio, prospecto.departamento].filter(Boolean).join(', ')
  const datos: Array<{ icono: ReactNode; etiqueta: string; valor: string }> = []
  if (prospecto.granja) datos.push({ icono: <IcBarn size={16} />, etiqueta: 'Granja', valor: prospecto.granja })
  if (ubicacion) datos.push({ icono: <IcPin size={16} />, etiqueta: 'Ubicación', valor: ubicacion })
  if (prospecto.numeroGalpones) datos.push({ icono: <IcHome size={16} />, etiqueta: 'Galpones', valor: String(prospecto.numeroGalpones) })
  if (prospecto.areaGalponM2 > 0) datos.push({ icono: <IcGrid size={16} />, etiqueta: 'Área galpón', valor: metros(prospecto.areaGalponM2) })
  if (prospecto.rol) datos.push({ icono: <IcUserCircle size={16} />, etiqueta: 'Rol', valor: prospecto.rol })
  if (decisor) datos.push({ icono: <IcUserCircle size={16} />, etiqueta: 'Decisor', valor: decisor })

  return (
    <>
      <div className="pros-panel-encabezado">
        <header className="pros-panel-identidad">
          <span className={`pros-avatar pros-avatar--${prospecto.etapa}`} aria-hidden="true">{iniciales(prospecto.nombre)}</span>
          <div>
            <h2>{prospecto.nombre}</h2>
            <p>
              <ChipTemperatura etapa={prospecto.etapa} />
              <span className="pros-canal">{prospecto.canal === 'whatsapp' ? 'WhatsApp' : prospecto.canal === 'web' ? 'Web' : 'Otro'}</span>
              <span className="pros-desde">Desde {fechaCorta.format(new Date(prospecto.fechaInicio))}</span>
            </p>
          </div>
          <Anillo valor={prospecto.puntaje} />
        </header>

        <div className="pros-contacto">
          {llamable && <a className="pros-contacto-btn" href={`tel:${prospecto.telefono}`}><IcPhone size={15} aria-hidden="true" />Llamar</a>}
          {whatsapp && <a className="pros-contacto-btn" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><IcChat size={15} aria-hidden="true" />WhatsApp</a>}
          {correo && <a className="pros-contacto-btn" href={`mailto:${correo}`}><IcSend size={15} aria-hidden="true" />Correo</a>}
          {!llamable && !correo && (
            <p className="pros-nota">
              {esIdentidadWhatsapp(prospecto.telefono)
                ? 'Escribió por WhatsApp sin compartir su número: respóndele desde la conversación en el WhatsApp de Avisens.'
                : 'No dejó teléfono ni correo.'}
            </p>
          )}
        </div>

        <nav className="pros-panel-tabs" role="tablist" aria-label="Secciones del prospecto">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'resumen'}
            className={`pros-panel-tab${pestana === 'resumen' ? ' is-activa' : ''}`}
            onClick={() => setPestana('resumen')}
          >
            Resumen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'chatbot'}
            className={`pros-panel-tab${pestana === 'chatbot' ? ' is-activa' : ''}`}
            onClick={() => setPestana('chatbot')}
          >
            Chatbot
            {respuestas.length > 0 && <span>{respuestas.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'cotizaciones'}
            className={`pros-panel-tab${pestana === 'cotizaciones' ? ' is-activa' : ''}`}
            onClick={() => setPestana('cotizaciones')}
          >
            Cotizaciones
            {cotizaciones.lista.length > 0 && <span>{cotizaciones.lista.length}</span>}
          </button>
        </nav>
      </div>

      <div className="pros-panel-cuerpo">
        {pestana === 'resumen' && (
          <>
            {activo && (
              <section className={`pros-accion pros-accion--${prioridad.grupo}`} aria-label="Qué hacer ahora">
                <span className="pros-accion-grupo">{GRUPOS[prioridad.grupo].titulo}</span>
                <strong>{accion?.titulo ?? 'Hacer seguimiento'}</strong>
                <p>{prioridad.motivo}</p>
                {accion && <p className="pros-accion-detalle">{accion.descripcion}</p>}
                {prospecto.fechaCallback && (
                  <p className="pros-accion-fecha"><IcCal size={14} aria-hidden="true" /> Llamada agendada: {fechaHora.format(new Date(prospecto.fechaCallback))}</p>
                )}
              </section>
            )}

            <label className="pros-asesor">
              <span>Lo atiende</span>
              <select
                value={prospecto.asesorId ?? ''}
                disabled={asignando || asesores.length === 0 || !activo}
                onChange={(evento) => { if (evento.target.value) onAsignar(Number(evento.target.value)) }}
              >
                <option value="" disabled>{asignando ? 'Asignando…' : 'Sin asignar'}</option>
                {asesorDesconocido && <option value={prospecto.asesorId ?? ''} disabled>Alguien que ya no está disponible</option>}
                {asesores.map((asesor) => (
                  <option key={asesor.id} value={asesor.id}>{asesor.id === yo ? `${asesor.nombre_completo} (tú)` : asesor.nombre_completo}</option>
                ))}
              </select>
            </label>

            <section className="pros-seccion">
              <h3>Su granja</h3>
              {datos.length > 0 ? (
                <div className="pros-datos">{datos.map((dato) => <Dato key={dato.etiqueta} {...dato} />)}</div>
              ) : (
                <p className="pros-nota">El chatbot no recogió datos de la granja. Confírmalos en la llamada.</p>
              )}
            </section>

            {solicitudesAbiertas > 0 && (
              <Link className="pros-soporte" to={`/solicitudes-pqrs?solicitud=${pendientes[0].id}`}>
                <span>{solicitudesAbiertas === 1 ? '1 solicitud PQRS abierta' : `${solicitudesAbiertas} solicitudes PQRS abiertas`}</span>
                <span>Atender <IcArrowRight size={14} aria-hidden="true" /></span>
              </Link>
            )}

            <section className="pros-zona-peligro" aria-label="Cierre y eliminación">
              {activo && (
                <AnimatePresence initial={false} mode="wait">
                  {descartando ? (
                    <motion.form
                      key="descarte"
                      className="pros-descarte"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={async (evento) => {
                        evento.preventDefault()
                        const texto = motivo === 'otro' ? otroMotivo.trim() : motivo
                        if (!texto) return
                        setEnviandoDescarte(true)
                        const hecho = await onDescartar(texto)
                        setEnviandoDescarte(false)
                        if (hecho) setDescartando(false)
                      }}
                    >
                      <fieldset>
                        <legend>¿Por qué se perdió?</legend>
                        <div className="pros-motivos">
                          {[...MOTIVOS_PERDIDA, 'otro'].map((opcion) => (
                            <label key={opcion} className={motivo === opcion ? 'is-activo' : undefined}>
                              <input type="radio" name="motivo-perdida" value={opcion} checked={motivo === opcion} onChange={() => setMotivo(opcion)} className="sr-only" />
                              {opcion === 'otro' ? 'Otro motivo' : opcion}
                            </label>
                          ))}
                        </div>
                        {motivo === 'otro' && (
                          <input className="pros-motivo-otro" value={otroMotivo} onChange={(evento) => setOtroMotivo(evento.target.value)} maxLength={300} placeholder="Cuéntalo en pocas palabras" aria-label="Otro motivo" autoFocus />
                        )}
                      </fieldset>
                      <p className="pros-nota">Saldrá de la bandeja activa y quedará registrado en Descartados.</p>
                      <div className="pros-descarte-acciones">
                        <button type="button" className="pros-boton-texto" onClick={() => setDescartando(false)} disabled={enviandoDescarte}>Cancelar</button>
                        <button type="submit" className="pros-boton-peligro" disabled={enviandoDescarte || (motivo === 'otro' && !otroMotivo.trim())}>
                          {enviandoDescarte ? 'Guardando…' : 'Marcar como perdido'}
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <div className="pros-zona-peligro-fila">
                      <button type="button" className="pros-boton-texto pros-abrir-descarte" onClick={() => setDescartando(true)}>
                        Marcar como perdido
                      </button>
                      <button type="button" className="pros-boton-eliminar" onClick={onEliminar} disabled={asignando}>
                        <IcTrash size={14} aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              )}

              {!activo && (
                <div className="pros-zona-peligro-fila pros-zona-peligro-fila--solo">
                  <button type="button" className="pros-boton-eliminar" onClick={onEliminar} disabled={asignando}>
                    <IcTrash size={14} aria-hidden="true" />
                    Eliminar prospecto
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {pestana === 'chatbot' && (
          <section className="pros-tab-seccion" aria-label="Respuestas del chatbot">
            {cargandoDetalle ? (
              <p className="pros-nota">Cargando respuestas del chatbot…</p>
            ) : respuestas.length === 0 ? (
              <div className="pros-tab-vacio">
                <p>No hay respuestas registradas del chatbot para este prospecto.</p>
              </div>
            ) : (
              <ul className="pros-respuestas-lista">
                {respuestas.map((respuesta, indice) => (
                  <li key={`${respuesta.codigo_pregunta ?? 'respuesta'}-${indice}`}>
                    <small>{respuesta.pregunta_texto ?? 'Pregunta'}</small>
                    <span>{respuesta.respuesta_texto ?? '—'}</span>
                    {respuesta.puntaje_obtenido ? <b>+{respuesta.puntaje_obtenido}</b> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {pestana === 'cotizaciones' && (
          <section className="pros-tab-seccion" aria-label="Cotizaciones del prospecto">
            <div className="pros-seccion-cabecera">
              <h3>Historial de cotizaciones</h3>
              {activo && (
                <button type="button" className="pros-boton-suave" onClick={() => void cotizaciones.generar()} disabled={cotizaciones.generando || cotizaciones.cargando}>
                  <IcPlus size={14} aria-hidden="true" />
                  {cotizaciones.generando ? 'Generando…' : 'Generar'}
                </button>
              )}
            </div>
            {cotizaciones.cargando ? (
              <p className="pros-nota">Cargando cotizaciones…</p>
            ) : cotizaciones.lista.length === 0 ? (
              <div className="pros-tab-vacio">
                <p>Aún no se han generado cotizaciones para este prospecto.</p>
              </div>
            ) : (
              <ul className="pros-cotizaciones">
                {cotizaciones.lista.map((cotizacion) => (
                  <li key={cotizacion.id}>
                    <span>
                      <strong>{cotizacion.codigo ?? `COT #${cotizacion.id}`}</strong>
                      <small>
                        {[cotizacion.plan_recomendado, cotizacion.numero_galpones !== null ? `${cotizacion.numero_galpones} galpón(es)` : null, fechaCorta.format(new Date(cotizacion.fecha_generacion))].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    <b>{pesos(cotizacion.valor_total_cop)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <footer className="pros-panel-pie">
        {activo ? (
          <>
            <button type="button" className="pros-convertir" onClick={() => { if (detalle) onConvertir(detalle) }} disabled={!puedeConvertir}>
              Convertir en cliente <IcArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="pros-convertir-nota">Crea su organización, su primera granja y su usuario de acceso.</p>
          </>
        ) : prospecto.etapa === 'cerrado' ? (
          <div className="pros-cerrado">
            <span><IcCheck size={16} aria-hidden="true" /> Ya es cliente activo</span>
            <Link to="/organizaciones" className="pros-cerrado-enlace">
              Ir a Clientes <IcArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="pros-perdido">
            {detalle?.resultado_cierre === 'perdido'
              ? `Se perdió${detalle.motivo_cierre ? `: ${detalle.motivo_cierre}` : '.'}`
              : 'Abandonó la conversación o no dio su consentimiento.'}
          </p>
        )}
      </footer>
    </>
  )
}

export default PanelProspecto
