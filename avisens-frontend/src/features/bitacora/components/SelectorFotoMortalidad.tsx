import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { IcPaperclip, IcTrash } from '@shared/ui/icons/icons'
import { validarArchivoFoto } from '@shared/utils/fotos'
import './FotoMortalidad.css'

type Props = {
  archivo: File | null
  tieneFotoActual?: boolean
  deshabilitado?: boolean
  onSeleccionar: (archivo: File | null) => void
  onError?: (mensaje: string) => void
}

function tamanoLegible(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SelectorFotoMortalidad({
  archivo,
  tieneFotoActual = false,
  deshabilitado = false,
  onSeleccionar,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!archivo) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(archivo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0] ?? null
    evento.target.value = ''
    if (!elegido) return
    const problema = validarArchivoFoto(elegido)
    if (problema) {
      onError?.(problema)
      return
    }
    onError?.('')
    onSeleccionar(elegido)
  }

  return (
    <div className="mort-foto-campo">
      <span className="mort-foto-etiqueta">
        Evidencia fotográfica <em>(Opcional)</em>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        disabled={deshabilitado}
        onChange={manejarCambio}
      />

      {archivo && previewUrl ? (
        <div className="mort-foto-preview">
          <img src={previewUrl} alt="Vista previa de evidencia de mortalidad" />
          <div className="mort-foto-preview-meta">
            <strong>{archivo.name}</strong>
            <small>{tamanoLegible(archivo.size)} · Se guardará con el registro</small>
          </div>
          <button
            type="button"
            className="mort-foto-btn mort-foto-btn--peligro"
            onClick={() => onSeleccionar(null)}
            disabled={deshabilitado}
          >
            <IcTrash size={14} aria-hidden="true" />
            Quitar
          </button>
        </div>
      ) : (
        <div className="mort-foto-drop">
          <div className="mort-foto-drop-info">
            <IcPaperclip size={16} aria-hidden="true" />
            <span>
              <strong>
                {tieneFotoActual ? 'Ya tiene evidencia fotográfica' : 'Adjuntar foto del hallazgo'}
              </strong>
              <small>
                {tieneFotoActual
                  ? 'Selecciona otra imagen si deseas reemplazarla (JPG, PNG o WebP · máx. 3 MB)'
                  : 'JPG, PNG o WebP · máx. 3 MB'}
              </small>
            </span>
          </div>
          <button
            type="button"
            className="mort-foto-btn"
            onClick={() => inputRef.current?.click()}
            disabled={deshabilitado}
          >
            {tieneFotoActual ? 'Cambiar foto' : 'Elegir foto'}
          </button>
        </div>
      )}
    </div>
  )
}

export default SelectorFotoMortalidad
