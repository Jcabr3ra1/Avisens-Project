import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { IcPaperclip, IcTrash } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { validarArchivoFoto } from '@shared/utils/fotos'
import {
  eliminarFotoMortalidad,
  obtenerFotoMortalidad,
  subirFotoMortalidad,
} from '../api/bitacora'
import type { Mortalidad } from '../model/bitacora'
import './FotoMortalidad.css'

type Props = {
  registro: Mortalidad
  puedeGestionar?: boolean
  onCerrar: () => void
  onActualizado: (id: number, mimeType: string | null) => void
}

function fechaLegible(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function ModalFotoMortalidad({
  registro,
  puedeGestionar = true,
  onCerrar,
  onActualizado,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlFoto, setUrlFoto] = useState<string | null>(null)
  const [cargando, setCargando] = useState(Boolean(registro.foto_mime_type))
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const tieneFoto = Boolean(registro.foto_mime_type)

  useEffect(() => {
    if (!tieneFoto) {
      setUrlFoto(null)
      setCargando(false)
      return
    }

    let activo = true
    let objectUrl: string | null = null
    setCargando(true)
    setError('')

    void obtenerFotoMortalidad(registro.id)
      .then((blob) => {
        if (!activo) return
        objectUrl = URL.createObjectURL(blob)
        setUrlFoto(objectUrl)
      })
      .catch((fallo) => {
        if (!activo) return
        setUrlFoto(null)
        setError(mensajeDeError(fallo, 'No se pudo cargar la fotografía de este registro.'))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [registro.id, tieneFoto, version])

  async function manejarArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return

    const problema = validarArchivoFoto(archivo)
    if (problema) {
      setError(problema)
      return
    }

    setProcesando(true)
    setError('')
    try {
      const res = await subirFotoMortalidad(registro.id, archivo)
      onActualizado(registro.id, res.mime_type)
      setVersion((actual) => actual + 1)
      toast.success(tieneFoto ? 'Fotografía actualizada' : 'Fotografía guardada')
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo guardar la fotografía.'))
    } finally {
      setProcesando(false)
    }
  }

  async function quitarFoto() {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar esta fotografía?',
      entidad: 'Evidencia de mortalidad',
      descripcion: 'El registro de mortalidad se conserva, pero la fotografía almacenada se borrará.',
      textoConfirmar: 'Eliminar fotografía',
      tono: 'peligro',
    }))) return

    setProcesando(true)
    setError('')
    try {
      await eliminarFotoMortalidad(registro.id)
      onActualizado(registro.id, null)
      toast.success('Fotografía eliminada')
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo eliminar la fotografía.'))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal
      titulo="Evidencia fotográfica de mortalidad"
      subtitulo={`${fechaLegible(registro.fecha)} · ${registro.cantidad_aves.toLocaleString('es-CO')} ${registro.cantidad_aves === 1 ? 'ave' : 'aves'}`}
      onCerrar={onCerrar}
      bloqueado={procesando}
      acciones={(
        <button type="button" className="modal-btn modal-btn--primary" onClick={onCerrar} disabled={procesando}>
          Cerrar
        </button>
      )}
    >
      <div className="mort-visor">
        <div className="mort-visor-meta">
          <span>
            <strong>Causa:</strong> {registro.causa_presuntiva || 'Sin causa registrada'}
          </span>
          {registro.observaciones && (
            <span>
              <strong>Observaciones:</strong> {registro.observaciones}
            </span>
          )}
        </div>

        <div className="mort-visor-marco">
          {cargando ? (
            <div className="mort-visor-vacio" role="status">
              <strong>Cargando fotografía…</strong>
            </div>
          ) : urlFoto ? (
            <img
              src={urlFoto}
              alt={`Evidencia fotográfica de mortalidad del ${fechaLegible(registro.fecha)}`}
            />
          ) : (
            <div className="mort-visor-vacio">
              <IcPaperclip size={22} aria-hidden="true" />
              <strong>Sin fotografía almacenada</strong>
              <p>Adjunta una foto en formato JPG, PNG o WebP (máx. 3 MB) como respaldo de este registro.</p>
            </div>
          )}
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}

        {puedeGestionar && (
          <div className="mort-visor-barra">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              disabled={procesando}
              onChange={(evento) => void manejarArchivo(evento)}
            />
            <div className="mort-visor-acciones">
              <button
                type="button"
                className="mort-foto-btn"
                onClick={() => inputRef.current?.click()}
                disabled={procesando}
              >
                <IcPaperclip size={14} aria-hidden="true" />
                {procesando ? 'Guardando…' : tieneFoto ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {tieneFoto && (
                <button
                  type="button"
                  className="mort-foto-btn mort-foto-btn--peligro"
                  onClick={() => void quitarFoto()}
                  disabled={procesando}
                >
                  <IcTrash size={14} aria-hidden="true" />
                  Eliminar foto
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ModalFotoMortalidad
