import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import type { Usuario } from '@shared/api'
import type { Galpon } from '@features/galpones/api/galpones'
import Modal from '@shared/ui/Modal/Modal'
import { IcBarn, IcPlus, IcTrash } from '@shared/ui/icons/icons'
import type { AsignacionGalpon } from '../api/asignacionesGalpon'

type Props = {
  usuario: Usuario
  asignaciones: AsignacionGalpon[]
  galpones: Galpon[]
  cargando: boolean
  guardando: boolean
  error: string
  onCerrar: () => void
  onAsignar: (galponId: number, rolAsignacion: string) => Promise<void>
  onRetirar: (galponId: number) => Promise<void>
}

// QA 17-nov: el panel se pintaba al pie de la página con controles del
// navegador sin estilo. Ahora usa el Modal compartido (portal, velo, foco
// atrapado y Escape) y los mismos campos y botones del resto de formularios.
function ModalAsignacionesGalpon({
  usuario,
  asignaciones,
  galpones,
  cargando,
  guardando,
  error,
  onCerrar,
  onAsignar,
  onRetirar,
}: Props) {
  const selectorRef = useRef<HTMLSelectElement>(null)
  const [galponId, setGalponId] = useState('')
  const [rolAsignacion, setRolAsignacion] = useState('')
  const asignacionesActivas = useMemo(
    () => asignaciones.filter((asignacion) => asignacion.activa),
    [asignaciones],
  )
  const galponesDisponibles = useMemo(
    () => galpones.filter((galpon) => (
      galpon.activo && !asignacionesActivas.some((asignacion) => asignacion.galpon_id === galpon.id)
    )),
    [asignacionesActivas, galpones],
  )
  const sinDisponibles = galponesDisponibles.length === 0

  async function enviarAsignacion(evento: FormEvent) {
    evento.preventDefault()
    if (!galponId) return

    try {
      await onAsignar(Number(galponId), rolAsignacion)
      setGalponId('')
      setRolAsignacion('')
      selectorRef.current?.focus()
    } catch {
      // No se descarta el error: `useAsignacionesGalpon` ya lo guardó en su
      // estado y este modal lo pinta abajo. Aquí solo se detiene el relanzado
      // para que no quede una promesa sin capturar, y se evita limpiar el
      // formulario, que es lo que distingue el fallo del acierto.
      return
    }
  }

  async function confirmarRetiro(asignacion: AsignacionGalpon) {
    const confirmado = (await confirmarAccion({
      titulo: '¿Retirar esta asignación?',
      entidad: asignacion.galpon.nombre,
      descripcion: `El galpón dejará de estar asignado a ${usuario.nombre_completo}.`,
      textoConfirmar: 'Retirar asignación',
      tono: 'aviso',
    }))
    if (confirmado) void onRetirar(asignacion.galpon_id)
  }

  return (
    <Modal
      titulo={`Galpones de ${usuario.nombre_completo}`}
      subtitulo="Asigna los galpones que este operario debe atender."
      onCerrar={onCerrar}
      ancho="ancho"
      bloqueado={guardando}
      focoInicial={selectorRef}
      icono={<span className="usuarios-asig-icono" aria-hidden="true"><IcBarn size={20} /></span>}
      acciones={
        <button type="button" className="modal-btn modal-btn--primary" onClick={onCerrar} disabled={guardando}>
          Listo
        </button>
      }
    >
      {cargando ? (
        <p className="usuarios-asignaciones-cargando" role="status">Cargando galpones…</p>
      ) : (
        <>
          <form className="usuarios-asig-form" onSubmit={enviarAsignacion} aria-labelledby="usuarios-asig-nuevo">
            <h3 id="usuarios-asig-nuevo" className="usuarios-asig-subtitulo">Asignar un galpón</h3>
            <div className="usuarios-asig-campos">
              <label className="modal-campo">
                <span>Galpón</span>
                <select
                  ref={selectorRef}
                  value={galponId}
                  onChange={(evento) => setGalponId(evento.target.value)}
                  disabled={guardando || sinDisponibles}
                  required
                >
                  <option value="">
                    {sinDisponibles ? 'No hay galpones disponibles' : 'Selecciona un galpón'}
                  </option>
                  {galponesDisponibles.map((galpon) => (
                    <option key={galpon.id} value={galpon.id}>
                      {galpon.nombre} · {galpon.granja.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-campo">
                <span>Responsabilidad <em>(Opcional)</em></span>
                <input
                  value={rolAsignacion}
                  onChange={(evento) => setRolAsignacion(evento.target.value)}
                  placeholder="Ej.: revisión diaria"
                  maxLength={100}
                  disabled={guardando || sinDisponibles}
                />
              </label>
            </div>

            <div className="usuarios-asig-acciones">
              {sinDisponibles && (
                <p className="modal-ayuda">Todos los galpones activos ya están asignados a este operario.</p>
              )}
              <button
                type="submit"
                className="modal-btn modal-btn--primary usuarios-asig-boton"
                disabled={guardando || !galponId}
              >
                <IcPlus size={16} />
                {guardando ? 'Asignando…' : 'Asignar galpón'}
              </button>
            </div>
          </form>

          {error && <p className="modal-error" role="alert">{error}</p>}

          <section className="usuarios-asig-listado" aria-labelledby="usuarios-asig-lista">
            <h3 id="usuarios-asig-lista" className="usuarios-asig-subtitulo">
              Galpones asignados <span className="usuarios-asig-cuenta">{asignacionesActivas.length}</span>
            </h3>
            {asignacionesActivas.length === 0 ? (
              <p className="usuarios-asignaciones-vacio">
                Este operario todavía no tiene galpones asignados. Elige uno arriba y pulsa «Asignar galpón».
              </p>
            ) : (
              <ul className="usuarios-asig-lista">
                {asignacionesActivas.map((asignacion) => (
                  <li key={asignacion.id} className="usuarios-asig-item">
                    <span className="usuarios-asig-icono" aria-hidden="true"><IcBarn size={18} /></span>
                    <div className="usuarios-asig-info">
                      <strong>{asignacion.galpon.nombre}</strong>
                      <span>{asignacion.galpon.codigo} · {asignacion.galpon.granja.nombre}</span>
                      {asignacion.rol_asignacion && <small>{asignacion.rol_asignacion}</small>}
                    </div>
                    <button
                      type="button"
                      className="modal-btn modal-btn--danger usuarios-asig-retirar"
                      onClick={() => confirmarRetiro(asignacion)}
                      disabled={guardando}
                      aria-label={`Retirar ${asignacion.galpon.nombre}`}
                    >
                      <IcTrash size={15} />
                      Retirar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Modal>
  )
}

export default ModalAsignacionesGalpon
