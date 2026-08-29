import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Usuario } from '@shared/api'
import type { Galpon } from '@features/galpones/api/galpones'
import { IcClose } from '@shared/ui/icons/icons'
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

  useEffect(() => {
    if (!cargando) selectorRef.current?.focus()
  }, [cargando])

  useEffect(() => {
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [onCerrar])

  async function enviarAsignacion(evento: FormEvent) {
    evento.preventDefault()
    if (!galponId) return

    try {
      await onAsignar(Number(galponId), rolAsignacion)
      setGalponId('')
      setRolAsignacion('')
      selectorRef.current?.focus()
    } catch {
      return
    }
  }

  function confirmarRetiro(asignacion: AsignacionGalpon) {
    const confirmado = window.confirm(
      `¿Retirar ${asignacion.galpon.nombre} de las responsabilidades de ${usuario.nombre_completo}?`,
    )
    if (confirmado) void onRetirar(asignacion.galpon_id)
  }

  return (
    <div className="usuarios-modal-overlay" onMouseDown={onCerrar}>
      <div
        className="usuarios-modal usuarios-modal-asignaciones"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usuarios-asignaciones-titulo"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="usuarios-modal-cabecera">
          <div>
            <h2 id="usuarios-asignaciones-titulo" className="usuarios-modal-titulo">
              Galpones de {usuario.nombre_completo}
            </h2>
            <p className="usuarios-asignaciones-ayuda">
              Asigna los galpones que este operario debe atender.
            </p>
          </div>
          <button
            type="button"
            className="usuarios-modal-cerrar"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar gestión de galpones"
          >
            <IcClose size={20} />
          </button>
        </div>

        {cargando ? (
          <p className="usuarios-asignaciones-cargando" role="status">Cargando galpones…</p>
        ) : (
          <>
            <form className="usuarios-asignaciones-form" onSubmit={enviarAsignacion}>
              <label className="usuarios-campo">
                <span>Galpón</span>
                <select
                  ref={selectorRef}
                  value={galponId}
                  onChange={(evento) => setGalponId(evento.target.value)}
                  disabled={guardando || galponesDisponibles.length === 0}
                  required
                >
                  <option value="">
                    {galponesDisponibles.length === 0 ? 'No hay galpones disponibles' : 'Selecciona un galpón'}
                  </option>
                  {galponesDisponibles.map((galpon) => (
                    <option key={galpon.id} value={galpon.id}>
                      {galpon.nombre} · {galpon.granja.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="usuarios-campo">
                <span>Responsabilidad <em>(opcional)</em></span>
                <input
                  value={rolAsignacion}
                  onChange={(evento) => setRolAsignacion(evento.target.value)}
                  placeholder="Ej.: revisión diaria"
                  maxLength={100}
                  disabled={guardando || galponesDisponibles.length === 0}
                />
              </label>

              <button
                type="submit"
                className="usuarios-btn-primary"
                disabled={guardando || !galponId}
              >
                {guardando ? 'Asignando…' : 'Asignar galpón'}
              </button>
            </form>

            {error && <p className="usuarios-modal-error" role="alert">{error}</p>}

            <section className="usuarios-asignaciones-listado" aria-label="Galpones asignados">
              <h3>Galpones asignados</h3>
              {asignacionesActivas.length === 0 ? (
                <p className="usuarios-asignaciones-vacio">Este operario todavía no tiene galpones asignados.</p>
              ) : (
                <ul className="usuarios-asignaciones-lista">
                  {asignacionesActivas.map((asignacion) => (
                    <li key={asignacion.id} className="usuarios-asignacion">
                      <div className="usuarios-asignacion-info">
                        <strong>{asignacion.galpon.nombre}</strong>
                        <span>{asignacion.galpon.codigo} · {asignacion.galpon.granja.nombre}</span>
                        {asignacion.rol_asignacion && <small>{asignacion.rol_asignacion}</small>}
                      </div>
                      <button
                        type="button"
                        className="usuarios-btn-retirar"
                        onClick={() => confirmarRetiro(asignacion)}
                        disabled={guardando}
                      >
                        Retirar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default ModalAsignacionesGalpon
