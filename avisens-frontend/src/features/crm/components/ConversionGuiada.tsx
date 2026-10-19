import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { Icon, IcArrowRight, IcCheck, IcRefresh } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import type { ProspectoConvertido, ProspectoDetalle } from '../api/prospectos'
import {
  campoSenalado,
  contrasenaSugerida,
  prellenarDesde,
  type FormularioConversion as Datos,
} from '../model/conversion'
import { PASO_DE_CAMPO, PASOS, errorDelPaso, usuarioSugerido } from '../model/conversionGuiada'
import './ConversionGuiada.css'

type Props = {
  prospecto: ProspectoDetalle
  onConvertir: (form: Datos) => Promise<ProspectoConvertido>
  onCerrar: () => void
}

type ErrorCampo = { mensaje: string; campo: keyof Datos | null }

function IcCopiar({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </Icon>
  )
}

function primerNombre(nombre: string | null): string {
  return nombre?.trim().split(/\s+/)[0] ?? ''
}

const ID_FORMULARIO = 'conversion-guiada'

function datosIniciales(prospecto: ProspectoDetalle): Datos {
  const base = prellenarDesde(prospecto)
  return {
    ...base,
    username: base.username || usuarioSugerido(base.nombre_completo),
    password: base.password || contrasenaSugerida(),
  }
}

function ConversionGuiada({ prospecto, onConvertir, onCerrar }: Props) {
  const [form, setForm] = useState<Datos>(() => datosIniciales(prospecto))
  const [indice, setIndice] = useState(0)
  const [direccion, setDireccion] = useState(1)
  const [error, setError] = useState<ErrorCampo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<ProspectoConvertido | null>(null)
  const campos = useRef<Partial<Record<keyof Datos, HTMLInputElement | null>>>({})
  const paso = PASOS[indice]

  useEffect(() => {
    if (!error?.campo) return
    const campoConError = error.campo
    const espera = window.setTimeout(() => campos.current[campoConError]?.focus(), 240)
    return () => window.clearTimeout(espera)
  }, [error])

  function cambiar<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    if (error?.campo === campo) setError(null)
  }

  function irA(destino: number) {
    setDireccion(destino > indice ? 1 : -1)
    setIndice(destino)
    setError(null)
  }

  async function avanzar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = errorDelPaso(form, paso.id)
    if (problema) {
      const pasoDelError = PASOS.findIndex((item) => item.id === PASO_DE_CAMPO[problema.campo])
      if (pasoDelError !== indice) irA(pasoDelError)
      setError(problema)
      return
    }
    if (paso.id !== 'confirmar') {
      irA(indice + 1)
      return
    }
    setGuardando(true)
    try {
      setResultado(await onConvertir(form))
    } catch (fallo) {
      const mensaje = mensajeDeError(fallo, 'No se pudo convertir el prospecto.')
      const campo = campoSenalado(mensaje)
      if (campo) irA(PASOS.findIndex((item) => item.id === PASO_DE_CAMPO[campo]))
      setError({ mensaje, campo })
    } finally {
      setGuardando(false)
    }
  }

  async function copiar(texto: string, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success(aviso)
    } catch {
      toast.error('No se pudo copiar.')
    }
  }

  function campo(nombre: keyof Datos, etiqueta: string, opciones: { ayuda?: ReactNode; opcional?: boolean; tipo?: string; autoComplete?: string; inputMode?: 'numeric' | 'tel' | 'email'; extra?: ReactNode } = {}) {
    const conError = error?.campo === nombre
    const idAyuda = opciones.ayuda ? `conv-${nombre}-ayuda` : undefined
    const idError = conError ? `conv-${nombre}-error` : undefined
    return (
      <div className="conv-campo">
        <label htmlFor={`conv-${nombre}`}>{etiqueta}{opciones.opcional && <em> · opcional</em>}</label>
        <div className="conv-campo-control">
          <input
            id={`conv-${nombre}`}
            ref={(elemento) => { campos.current[nombre] = elemento }}
            type={opciones.tipo ?? 'text'}
            value={form[nombre]}
            onChange={(evento) => cambiar(nombre, evento.target.value)}
            name={`avisens-conversion-${prospecto.id}-${nombre}`}
            autoComplete={opciones.autoComplete ?? 'off'}
            data-lpignore="true"
            data-1p-ignore="true"
            inputMode={opciones.inputMode}
            aria-invalid={conError}
            aria-describedby={conError ? idError : idAyuda}
            className={conError ? 'is-error' : undefined}
          />
          {opciones.extra}
        </div>
        {conError
          ? <small id={idError} className="conv-error" role="alert">{error.mensaje}</small>
          : opciones.ayuda && <small id={idAyuda}>{opciones.ayuda}</small>}
      </div>
    )
  }

  if (resultado) {
    const acceso = `Usuario: ${resultado.usuario.username}\nContraseña: ${form.password}`
    return (
      <Modal
        titulo="Cliente creado"
        onCerrar={onCerrar}
        acciones={(
          <>
            <button type="button" className="modal-btn" onClick={onCerrar}>Cerrar</button>
            <Link className="modal-btn modal-btn--primary conv-enlace" to={`/organizaciones/${resultado.usuario.organizacion.id}`}>
              Abrir su organización <IcArrowRight size={16} aria-hidden="true" />
            </Link>
          </>
        )}
      >
        <div className="conv-listo">
          <motion.span className="conv-listo-icono" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.45, duration: 0.6 }}>
            <IcCheck size={30} aria-hidden="true" />
          </motion.span>
          <h3>{resultado.usuario.nombre_completo} ya es cliente</h3>
          <p>Se creó <strong>{resultado.usuario.organizacion.nombre}</strong> con su primera granja. Entrégale sus datos de acceso:</p>
          <dl className="conv-credenciales">
            <div><dt>Usuario</dt><dd>{resultado.usuario.username}</dd></div>
            <div><dt>Contraseña</dt><dd>{form.password}</dd></div>
          </dl>
          <button type="button" className="modal-btn conv-copiar-acceso" onClick={() => void copiar(acceso, 'Datos de acceso copiados')}><IcCopiar size={16} />Copiar usuario y contraseña</button>
          <small>La contraseña no se volverá a mostrar. El cliente puede cambiarla al entrar.</small>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={primerNombre(prospecto.nombre) ? `Convierte a ${primerNombre(prospecto.nombre)} en cliente` : 'Convertir en cliente'}
      subtitulo="Crearemos su organización, su primera granja y su acceso a Avisens."
      onCerrar={guardando ? () => undefined : onCerrar}
      acciones={(
        <div className="conv-pie">
          {indice > 0 ? (
            <button type="button" className="modal-btn" onClick={() => irA(indice - 1)} disabled={guardando}>Atrás</button>
          ) : (
            <button type="button" className="modal-btn conv-cancelar" onClick={onCerrar}>Cancelar</button>
          )}
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary conv-siguiente" disabled={guardando}>
            {paso.id === 'confirmar' ? (guardando ? 'Creando cliente…' : 'Crear cliente') : 'Continuar'}
            {paso.id !== 'confirmar' && <IcArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      )}
    >
      <ol className="conv-pasos" aria-label="Pasos de la conversión">
        {PASOS.map((item, posicion) => {
          const estado = posicion < indice ? 'hecho' : posicion === indice ? 'actual' : 'pendiente'
          return (
            <li key={item.id} className={`conv-paso is-${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
              <button type="button" onClick={() => irA(posicion)} disabled={posicion > indice || guardando}>
                <span className="conv-paso-marca">{estado === 'hecho' ? <IcCheck size={14} aria-hidden="true" /> : posicion + 1}</span>
                <span className="conv-paso-titulo">{item.titulo}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <form id={ID_FORMULARIO} onSubmit={(evento) => void avanzar(evento)} noValidate className="conv-formulario">
        {error && !error.campo && <p className="conv-error conv-error--general" role="alert">{error.mensaje}</p>}
        <AnimatePresence mode="wait" initial={false} custom={direccion}>
          <motion.fieldset
            key={paso.id}
            className="conv-cuerpo"
            custom={direccion}
            initial={{ opacity: 0, x: direccion * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direccion * -28 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <legend className="conv-encabezado">
              <span>Paso {indice + 1} de {PASOS.length}</span>
              <strong>{paso.pregunta}</strong>
              <small>{paso.descripcion}</small>
            </legend>

            {paso.id === 'propietario' && (
              <>
                {campo('nombre_completo', 'Nombre completo', { autoComplete: 'name' })}
                <div className="conv-fila">
                  {campo('cedula', 'Cédula', {
                    inputMode: 'numeric',
                    ayuda: prospecto.documento ? 'La dio al radicar una PQRS: confírmala.' : 'El chatbot no la pregunta: pídesela.',
                  })}
                  {campo('telefono', 'Teléfono', { opcional: true, inputMode: 'tel', autoComplete: 'tel' })}
                </div>
              </>
            )}

            {paso.id === 'granja' && (
              <>
                {campo('organizacion_nombre', 'Organización', {
                  opcional: true,
                  ayuda: 'La empresa cliente. Si la dejas vacía, se llama como el propietario.',
                })}
                <div className="conv-fila">
                  {campo('granja_nombre', 'Nombre de la granja', { ayuda: 'La finca, no la empresa. Sin ella entra a un sistema vacío.' })}
                  {campo('granja_municipio', 'Municipio', { opcional: true })}
                </div>
              </>
            )}

            {paso.id === 'acceso' && (
              <>
                {campo('username', 'Usuario de acceso', {
                  ayuda: 'Lo sugerimos con su nombre. 3 a 30 caracteres: letras sin tildes, números, punto o guion.',
                  extra: (
                    <button type="button" className="conv-accion-campo" onClick={() => cambiar('username', usuarioSugerido(form.nombre_completo))} title="Sugerir a partir del nombre">
                      <IcRefresh size={15} aria-hidden="true" /><span>Sugerir</span>
                    </button>
                  ),
                })}
                {campo('password', 'Contraseña inicial', {
                  ayuda: 'Sin caracteres que se confundan al dictarla. Se la entregarás al final.',
                  extra: (
                    <>
                      <button type="button" className="conv-accion-campo" onClick={() => cambiar('password', contrasenaSugerida())} title="Generar otra contraseña">
                        <IcRefresh size={15} aria-hidden="true" /><span>Otra</span>
                      </button>
                      <button type="button" className="conv-accion-campo" onClick={() => void copiar(form.password, 'Contraseña copiada')} disabled={!form.password} title="Copiar contraseña">
                        <IcCopiar size={15} /><span>Copiar</span>
                      </button>
                    </>
                  ),
                })}
                {campo('email', 'Correo', { opcional: true, tipo: 'email', inputMode: 'email', autoComplete: 'email', ayuda: 'Solo como dato de contacto.' })}
              </>
            )}

            {paso.id === 'confirmar' && (
              <div className="conv-resumen">
                {[
                  { titulo: 'Propietario', destino: 0, filas: [['Nombre', form.nombre_completo], ['Cédula', form.cedula], ['Teléfono', form.telefono]] },
                  { titulo: 'Granja', destino: 1, filas: [['Organización', form.organizacion_nombre.trim() || `Organización de ${form.nombre_completo.trim()}`], ['Granja', form.granja_nombre], ['Municipio', form.granja_municipio]] },
                  { titulo: 'Acceso', destino: 2, filas: [['Usuario', form.username.trim().toLowerCase()], ['Correo', form.email]] },
                ].map((bloque) => (
                  <section key={bloque.titulo}>
                    <header>
                      <h4>{bloque.titulo}</h4>
                      <button type="button" onClick={() => irA(bloque.destino)}>Editar</button>
                    </header>
                    <dl>
                      {bloque.filas.filter(([, valor]) => valor.trim()).map(([etiqueta, valor]) => (
                        <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </motion.fieldset>
        </AnimatePresence>
      </form>
    </Modal>
  )
}

export default ConversionGuiada
