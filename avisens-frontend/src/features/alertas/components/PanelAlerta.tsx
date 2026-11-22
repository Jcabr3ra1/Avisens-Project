import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api/tokens'
import Modal from '@shared/ui/Modal/Modal'
import { IcPaperclip, IcTrash } from '@shared/ui/icons/icons'
import { validarArchivoFoto } from '@shared/utils/fotos'
import { mensajeDeError } from '@shared/utils/errores'
import {
  crearEvidenciaAlerta,
  eliminarEvidenciaAlerta,
  listarEvidenciasDeAlerta,
  obtenerImagenEvidencia,
  subirFotoEvidenciaAlerta,
  type EvidenciaAlerta,
} from '../api/evidencias-alerta'
import { listarDestinatariosAlerta, type Alerta, type DestinatarioAlerta } from '../api/alertas'
import { etiquetaCriticidad, etiquetaEstado } from '../model/alerta'

interface PanelAlertaProps {
  alerta: Alerta | null
  cerrando: boolean
  onCerrar: (id: number, accion: string) => Promise<Alerta | null>
  onEscalar: (id: number, usuarioId: number) => Promise<boolean>
  onSalir: () => void
}

function PanelAlerta({ alerta, cerrando, onCerrar, onEscalar, onSalir }: PanelAlertaProps) {
  const [accion, setAccion] = useState('')
  const [enlaceEvidencia, setEnlaceEvidencia] = useState('')
  const [fotoPendiente, setFotoPendiente] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [evidencias, setEvidencias] = useState<EvidenciaAlerta[]>([])
  const [urlsImagenes, setUrlsImagenes] = useState<Record<number, string>>({})
  const [destinatarios, setDestinatarios] = useState<DestinatarioAlerta[]>([])
  const [destinatarioId, setDestinatarioId] = useState('')
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const inputFotoDirectaRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<Record<number, string>>({})

  const rol = getRol()
  const puedeEscalar = rol === 'Administrador' || rol === 'Propietario'

  useEffect(() => {
    if (!fotoPendiente) {
      setVistaPrevia(null)
      return
    }
    const url = URL.createObjectURL(fotoPendiente)
    setVistaPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoPendiente])

  useEffect(() => {
    if (!alerta) return
    setAccion('')
    setEnlaceEvidencia('')
    setFotoPendiente(null)
    setDestinatarioId('')
  }, [alerta])

  useEffect(() => {
    if (!alerta || !puedeEscalar) return
    let vigente = true
    listarDestinatariosAlerta()
      .then((usuarios) => { if (vigente) setDestinatarios(usuarios) })
      .catch(() => { if (vigente) setDestinatarios([]) })
    return () => { vigente = false }
  }, [alerta, puedeEscalar])

  useEffect(() => {
    const revocarTodas = () => {
      Object.values(urlsRef.current).forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = {}
      setUrlsImagenes({})
    }

    if (!alerta) {
      setEvidencias([])
      revocarTodas()
      return
    }

    let vigente = true
    revocarTodas()

    async function cargarEvidencias() {
      try {
        const lista = await listarEvidenciasDeAlerta(alerta!.id)
        if (!vigente) return
        setEvidencias(lista)

        const conImagen = lista.filter((item) => Boolean(item.mime_type))
        const descargadas = await Promise.allSettled(
          conImagen.map(async (item) => {
            const blob = await obtenerImagenEvidencia(item.id)
            return { id: item.id, url: URL.createObjectURL(blob) }
          }),
        )
        if (!vigente) {
          descargadas.forEach((res) => {
            if (res.status === 'fulfilled') URL.revokeObjectURL(res.value.url)
          })
          return
        }
        const mapa: Record<number, string> = {}
        descargadas.forEach((res) => {
          if (res.status === 'fulfilled') mapa[res.value.id] = res.value.url
        })
        urlsRef.current = mapa
        setUrlsImagenes(mapa)
      } catch {
        if (vigente) setEvidencias([])
      }
    }

    void cargarEvidencias()
    return () => {
      vigente = false
      revocarTodas()
    }
  }, [alerta])

  if (!alerta) return null
  const alertaSeleccionada = alerta

  function elegirFotoParaCierre(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return
    const problema = validarArchivoFoto(archivo)
    if (problema) {
      toast.error(problema)
      return
    }
    setFotoPendiente(archivo)
  }

  async function subirFotoDirecta(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return
    const problema = validarArchivoFoto(archivo)
    if (problema) {
      toast.error(problema)
      return
    }
    setSubiendoFoto(true)
    try {
      const nueva = await subirFotoEvidenciaAlerta(alertaSeleccionada.id, archivo)
      const blob = await obtenerImagenEvidencia(nueva.id)
      const url = URL.createObjectURL(blob)
      urlsRef.current = { ...urlsRef.current, [nueva.id]: url }
      setUrlsImagenes((actuales) => ({ ...actuales, [nueva.id]: url }))
      setEvidencias((actuales) => [nueva, ...actuales])
      toast.success('Fotografía guardada como evidencia')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo subir la fotografía.'))
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function borrarEvidencia(id: number) {
    try {
      await eliminarEvidenciaAlerta(id)
      setEvidencias((actuales) => actuales.filter((item) => item.id !== id))
      if (urlsRef.current[id]) {
        URL.revokeObjectURL(urlsRef.current[id])
        const copia = { ...urlsRef.current }
        delete copia[id]
        urlsRef.current = copia
        setUrlsImagenes(copia)
      }
      toast.success('Evidencia eliminada')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar la evidencia.'))
    }
  }

  async function guardarCierre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accion.trim()) return
    const cerrada = await onCerrar(alertaSeleccionada.id, accion.trim())
    if (!cerrada) return

    if (fotoPendiente) {
      try {
        await subirFotoEvidenciaAlerta(alertaSeleccionada.id, fotoPendiente, accion.trim())
      } catch {
        toast.warning('La alerta se cerró, pero no se pudo guardar la fotografía de evidencia')
      }
    }

    if (enlaceEvidencia.trim()) {
      try {
        await crearEvidenciaAlerta({
          alerta_id: alertaSeleccionada.id,
          tipo_evidencia: 'enlace',
          archivo_url: enlaceEvidencia.trim(),
          comentario: accion.trim(),
        })
      } catch {
        toast.warning('La alerta se cerró, pero no se pudo guardar el enlace de evidencia')
      }
    }
    onSalir()
  }

  async function guardarEscalamiento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destinatarioId) return
    const escalada = await onEscalar(alertaSeleccionada.id, Number(destinatarioId))
    if (escalada) onSalir()
  }

  return (
    <Modal
      variante="lateral"
      titulo={`${alerta.tipo} en ${alerta.galpon.nombre}`}
      subtitulo={alerta.mensaje ?? 'Se detectó una lectura fuera del rango configurado.'}
      onCerrar={onSalir}
    >
      <div className="ale-panel-badges">
        <span className={`ale-prioridad ale-prioridad--${alerta.criticidad}`}>{etiquetaCriticidad(alerta.criticidad)}</span>
        <span className={`ale-estado ale-estado--${alerta.estado}`}>{etiquetaEstado(alerta.estado)}</span>
      </div>
      <dl className="ale-panel-datos">
        <div><dt>Lectura detectada</dt><dd>{alerta.valor_detectado ?? '—'}</dd></div>
        <div><dt>Valor de referencia</dt><dd>{alerta.valor_umbral ?? '—'}</dd></div>
        <div><dt>Sensor</dt><dd>{alerta.sensor?.codigo ?? 'Sin sensor'}</dd></div>
        <div><dt>Lote</dt><dd>{alerta.lote?.codigo ?? 'Sin lote activo'}</dd></div>
        <div><dt>Responsable</dt><dd>{alerta.responsable?.nombre_completo ?? 'Sin asignar'}</dd></div>
        <div><dt>Estado</dt><dd>{etiquetaEstado(alerta.estado)}</dd></div>
      </dl>
      {alerta.accion_correctiva && (
        <div className="ale-accion-registrada">
          <strong>Acción registrada</strong>
          <span>{alerta.accion_correctiva}</span>
        </div>
      )}

      <section className="ale-evidencias-seccion" aria-label="Evidencias fotográficas">
        <div className="ale-evidencias-cab">
          <strong>Evidencias ({evidencias.length})</strong>
          <input
            ref={inputFotoDirectaRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="ale-input-oculto"
            onChange={(e) => void subirFotoDirecta(e)}
          />
          <button
            type="button"
            className="adm-btn adm-btn--secundario ale-btn-foto"
            onClick={() => inputFotoDirectaRef.current?.click()}
            disabled={subiendoFoto}
          >
            <IcPaperclip size={14} aria-hidden="true" />
            {subiendoFoto ? 'Subiendo…' : 'Subir foto'}
          </button>
        </div>

        {evidencias.length > 0 && (
          <div className="ale-evidencias-grid">
            {evidencias.map((ev) => {
              const urlImg = urlsImagenes[ev.id]
              return (
                <article key={ev.id} className="ale-evidencia-item">
                  {urlImg ? (
                    <a href={urlImg} target="_blank" rel="noreferrer" className="ale-evidencia-thumb">
                      <img src={urlImg} alt={ev.comentario || 'Fotografía de evidencia'} />
                    </a>
                  ) : ev.archivo_url ? (
                    <a href={ev.archivo_url} target="_blank" rel="noreferrer" className="ale-evidencia-link">
                      Ver enlace adjunto
                    </a>
                  ) : (
                    <span className="ale-evidencia-cargando">Cargando imagen…</span>
                  )}
                  <div className="ale-evidencia-pie">
                    <small>{ev.comentario || ev.usuario?.nombre_completo || 'Evidencia'}</small>
                    <button
                      type="button"
                      className="ale-evidencia-borrar"
                      onClick={() => void borrarEvidencia(ev.id)}
                      aria-label="Eliminar evidencia"
                    >
                      <IcTrash size={13} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {alerta.estado !== 'cerrada' && (
        <>
          <form className="ale-form-cierre" onSubmit={(event) => void guardarCierre(event)}>
            <label>¿Qué hiciste para resolverla?
              <textarea
                value={accion}
                onChange={(event) => setAccion(event.target.value)}
                placeholder="Ej.: ajusté la ventilación y confirmé una lectura estable."
                required
                rows={4}
              />
            </label>

            <div className="ale-foto-campo">
              <span className="ale-foto-label">Fotografía de evidencia <small>Opcional · JPG, PNG o WebP (máx. 3 MB)</small></span>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="ale-input-oculto"
                onChange={elegirFotoParaCierre}
              />
              {vistaPrevia ? (
                <div className="ale-foto-preview">
                  <img src={vistaPrevia} alt="Vista previa de la evidencia" />
                  <button
                    type="button"
                    className="adm-btn adm-btn--secundario"
                    onClick={() => setFotoPendiente(null)}
                  >
                    Quitar foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="adm-btn adm-btn--secundario"
                  onClick={() => inputFotoRef.current?.click()}
                >
                  <IcPaperclip size={14} aria-hidden="true" />
                  Adjuntar foto desde dispositivo
                </button>
              )}
            </div>

            <label>Enlace externo <small>Opcional</small>
              <input
                type="url"
                value={enlaceEvidencia}
                onChange={(event) => setEnlaceEvidencia(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <button type="submit" className="adm-btn adm-btn--primario" disabled={cerrando}>
              {cerrando ? 'Guardando…' : 'Cerrar alerta'}
            </button>
          </form>
          {puedeEscalar && destinatarios.length > 0 && (
            <form className="ale-form-escalar" onSubmit={(event) => void guardarEscalamiento(event)}>
              <label>Escalar a otra persona
                <select value={destinatarioId} onChange={(event) => setDestinatarioId(event.target.value)}>
                  <option value="">Selecciona una persona</option>
                  {destinatarios.map((destinatario) => (
                    <option key={destinatario.id} value={destinatario.id}>
                      {destinatario.nombre_completo}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="adm-btn adm-btn--secundario" disabled={cerrando || !destinatarioId}>
                Escalar alerta
              </button>
            </form>
          )}
        </>
      )}
    </Modal>
  )
}

export default PanelAlerta
