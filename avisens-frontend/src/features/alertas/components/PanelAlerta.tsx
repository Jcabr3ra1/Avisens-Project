import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api/tokens'
import Modal from '@shared/ui/Modal/Modal'
import { crearEvidenciaAlerta } from '../api/evidencias-alerta'
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
  const [destinatarios, setDestinatarios] = useState<DestinatarioAlerta[]>([])
  const [destinatarioId, setDestinatarioId] = useState('')
  // Escalar es una acción real contra el backend: el rol que decide es el
  // autenticado, no el de la vista previa.
  const rol = getRol()
  const puedeEscalar = rol === 'Administrador' || rol === 'Propietario'

  useEffect(() => {
    if (!alerta || !puedeEscalar) return
    let vigente = true
    listarDestinatariosAlerta()
      .then((usuarios) => { if (vigente) setDestinatarios(usuarios) })
      .catch(() => { if (vigente) setDestinatarios([]) })
    return () => { vigente = false }
  }, [alerta, puedeEscalar])

  if (!alerta) return null
  const alertaSeleccionada = alerta

  async function guardarCierre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accion.trim()) return
    const cerrada = await onCerrar(alertaSeleccionada.id, accion.trim())
    if (!cerrada) return
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
      titulo={`${alerta.tipo} en ${alerta.galpon.nombre}`}
      subtitulo={alerta.mensaje ?? 'Se detectó una lectura fuera del rango configurado.'}
      onCerrar={onSalir}
    >
      <span className={`ale-prioridad ale-prioridad--${alerta.criticidad}`}>{etiquetaCriticidad(alerta.criticidad)}</span>
      <dl className="ale-panel-datos">
        <div><dt>Estado</dt><dd>{etiquetaEstado(alerta.estado)}</dd></div>
        <div><dt>Lectura detectada</dt><dd>{alerta.valor_detectado ?? '—'}</dd></div>
        <div><dt>Valor de referencia</dt><dd>{alerta.valor_umbral ?? '—'}</dd></div>
        <div><dt>Sensor</dt><dd>{alerta.sensor?.codigo ?? 'Sin sensor asociado'}</dd></div>
        <div><dt>Lote</dt><dd>{alerta.lote?.codigo ?? 'Sin lote activo'}</dd></div>
        <div><dt>Responsable</dt><dd>{alerta.responsable?.nombre_completo ?? 'Sin asignar'}</dd></div>
      </dl>
      {alerta.accion_correctiva && <div className="ale-accion-registrada"><strong>Acción registrada</strong><span>{alerta.accion_correctiva}</span></div>}
      {alerta.estado !== 'cerrada' && (
        <>
          <form className="ale-form-cierre" onSubmit={(event) => void guardarCierre(event)}>
            <label>¿Qué hiciste para resolverla?
              <textarea value={accion} onChange={(event) => setAccion(event.target.value)} placeholder="Ej.: ajusté la ventilación y confirmé una lectura estable." required rows={4} />
            </label>
            <label>Enlace de evidencia <small>Opcional</small>
              <input type="url" value={enlaceEvidencia} onChange={(event) => setEnlaceEvidencia(event.target.value)} placeholder="https://…" />
            </label>
            <button type="submit" className="ale-btn ale-btn--principal" disabled={cerrando}>{cerrando ? 'Guardando…' : 'Cerrar alerta'}</button>
          </form>
          {puedeEscalar && destinatarios.length > 0 && (
            <form className="ale-form-escalar" onSubmit={(event) => void guardarEscalamiento(event)}>
              <label>Escalar a otra persona
                <select value={destinatarioId} onChange={(event) => setDestinatarioId(event.target.value)}>
                  <option value="">Selecciona una persona</option>
                  {destinatarios.map((destinatario) => <option key={destinatario.id} value={destinatario.id}>{destinatario.nombre_completo}</option>)}
                </select>
              </label>
              <button type="submit" className="ale-btn ale-btn--secundario" disabled={cerrando || !destinatarioId}>Escalar alerta</button>
            </form>
          )}
        </>
      )}
    </Modal>
  )
}

export default PanelAlerta
