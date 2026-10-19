import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { getUsuario, type Usuario } from '@shared/api'
import {
  IcArrowRight,
  IcBarn,
  IcCal,
  IcChat,
  IcCheck,
  IcGrid,
  IcHome,
  IcPhone,
  IcPin,
  IcPlus,
  IcSend,
  IcSidebar,
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

type Props = {
  prospecto: ProspectoVista | null
  prioridad: Prioridad | null
  asesores: Usuario[]
  asignando: boolean
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
          transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
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

function PanelProspecto({ prospecto, prioridad, asesores, asignando, onAsignar, onConvertir, onDescartar, onEliminar }: Props) {
  return (
    <aside className="pros-panel" aria-label="Prospecto seleccionado">
      <div className="pros-panel-cabecera">
        <IcSidebar size={16} aria-hidden="true" />
        Prospecto seleccionado
        {prospecto && (
          <button type="button" className="pros-boton-texto pros-eliminar" onClick={onEliminar} disabled={asignando} aria-label="Eliminar prospecto">
            Eliminar
          </button>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {prospecto && prioridad ? (
          <motion.div
            key={prospecto.id}
            className="pros-panel-cuerpo"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          >
            <PanelContenido
              prospecto={prospecto}
              prioridad={prioridad}
              asesores={asesores}
              asignando={asignando}
              onAsignar={onAsignar}
              onConvertir={onConvertir}
              onDescartar={onDescartar}
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
  )
}

function PanelContenido({ prospecto, prioridad, asesores, asignando, onAsignar, onConvertir, onDescartar }: Omit<Props, 'prospecto' | 'prioridad' | 'onEliminar'> & {
  prospecto: ProspectoVista
  prioridad: Prioridad
}) {
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
  if (prospecto.granja) datos.push({ icono: <IcBarn size={17} />, etiqueta: 'Granja', valor: prospecto.granja })
  if (ubicacion) datos.push({ icono: <IcPin size={17} />, etiqueta: 'Ubicación', valor: ubicacion })
  if (prospecto.numeroGalpones) datos.push({ icono: <IcHome size={17} />, etiqueta: 'Galpones', valor: String(prospecto.numeroGalpones) })
  if (prospecto.areaGalponM2 > 0) datos.push({ icono: <IcGrid size={17} />, etiqueta: 'Área del galpón', valor: metros(prospecto.areaGalponM2) })
  if (prospecto.rol) datos.push({ icono: <IcUserCircle size={17} />, etiqueta: 'Rol', valor: prospecto.rol })
  if (decisor) datos.push({ icono: <IcUserCircle size={17} />, etiqueta: 'Quién decide', valor: decisor })

  return (
    <>
      <header className="pros-panel-identidad">
        <span className={`pros-avatar pros-avatar--${prospecto.etapa}`} aria-hidden="true">{iniciales(prospecto.nombre)}</span>
        <div>
          <h2>{prospecto.nombre}</h2>
          <p>
            <ChipTemperatura etapa={prospecto.etapa} />
            <span className="pros-canal">{prospecto.canal === 'whatsapp' ? 'WhatsApp' : prospecto.canal === 'web' ? 'Web' : 'Otro canal'}</span>
            <span className="pros-desde">Desde {fechaCorta.format(new Date(prospecto.fechaInicio))}</span>
          </p>
        </div>
        <Anillo valor={prospecto.puntaje} />
      </header>

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

      <div className="pros-contacto">
        {llamable && <a className="pros-contacto-btn" href={`tel:${prospecto.telefono}`}><IcPhone size={16} aria-hidden="true" />Llamar</a>}
        {whatsapp && <a className="pros-contacto-btn" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><IcChat size={16} aria-hidden="true" />WhatsApp</a>}
        {correo && <a className="pros-contacto-btn" href={`mailto:${correo}`}><IcSend size={16} aria-hidden="true" />Correo</a>}
        {!llamable && !correo && (
          <p className="pros-nota">
            {esIdentidadWhatsapp(prospecto.telefono)
              ? 'Escribió por WhatsApp sin compartir su número: respóndele desde la conversación en el WhatsApp de Avisens.'
              : 'No dejó teléfono ni correo.'}
          </p>
        )}
      </div>

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

      {respuestas.length > 0 && (
        <details className="pros-respuestas">
          <summary>Lo que respondió en el chatbot <span>{respuestas.length}</span></summary>
          <ul>
            {respuestas.map((respuesta, indice) => (
              <li key={`${respuesta.codigo_pregunta ?? 'respuesta'}-${indice}`}>
                <small>{respuesta.pregunta_texto ?? 'Pregunta'}</small>
                <span>{respuesta.respuesta_texto ?? '—'}</span>
                {respuesta.puntaje_obtenido ? <b>+{respuesta.puntaje_obtenido}</b> : null}
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="pros-seccion">
        <div className="pros-seccion-cabecera">
          <h3>Cotizaciones</h3>
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
          <p className="pros-nota">Aún no tiene cotizaciones.</p>
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

      {solicitudesAbiertas > 0 && (
        <Link className="pros-soporte" to={`/solicitudes-pqrs?solicitud=${pendientes[0].id}`}>
          <span>{solicitudesAbiertas === 1 ? '1 solicitud PQRS abierta' : `${solicitudesAbiertas} solicitudes PQRS abiertas`}</span>
          <span>Atender en Soporte <IcArrowRight size={15} aria-hidden="true" /></span>
        </Link>
      )}

      {activo ? (
        <button type="button" className="pros-convertir" onClick={() => { if (detalle) onConvertir(detalle) }} disabled={!puedeConvertir}>
          Convertir en cliente <IcArrowRight size={18} aria-hidden="true" />
        </button>
      ) : prospecto.etapa === 'cerrado' ? (
        <p className="pros-cerrado"><IcCheck size={16} aria-hidden="true" /> Ya es cliente: su organización está en Organizaciones.</p>
      ) : (
        <p className="pros-perdido">
          {detalle?.resultado_cierre === 'perdido'
            ? `Se perdió${detalle.motivo_cierre ? `: ${detalle.motivo_cierre}` : '.'}`
            : 'Abandonó la conversación o no dio su consentimiento.'}
        </p>
      )}
      {activo && <p className="pros-convertir-nota">Crea su organización, su granja y su usuario de acceso.</p>}

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
                  <input className="pros-motivo-otro" value={otroMotivo} onChange={(evento) => setOtroMotivo(evento.target.value)} placeholder="Cuéntalo en pocas palabras" aria-label="Otro motivo" autoFocus />
                )}
              </fieldset>
              <p className="pros-nota">El motivo sirve para entender por qué se caen los prospectos. Saldrá de la bandeja activa.</p>
              <div className="pros-descarte-acciones">
                <button type="button" className="pros-boton-texto" onClick={() => setDescartando(false)} disabled={enviandoDescarte}>Cancelar</button>
                <button type="submit" className="pros-boton-peligro" disabled={enviandoDescarte || (motivo === 'otro' && !otroMotivo.trim())}>
                  {enviandoDescarte ? 'Guardando…' : 'Marcar como perdido'}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button key="abrir-descarte" type="button" className="pros-boton-texto pros-abrir-descarte" onClick={() => setDescartando(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Marcar como perdido
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </>
  )
}

export default PanelProspecto
