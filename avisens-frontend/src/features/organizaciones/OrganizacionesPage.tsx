import { useMemo, useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcLeaf, IcRefresh, IcUsers } from '@shared/ui/icons/icons'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import FormularioOrganizacion from './components/FormularioOrganizacion'
import { useOrganizaciones } from './hooks/useOrganizaciones'
import type { Organizacion } from './api/organizaciones'
import {
  etiquetaPlan,
  fechaCorta,
  normalizarPlan,
  resumirOrganizaciones,
} from './model/organizacion'
import '@shared/ui/admin/AdminKit.css'
import './OrganizacionesPage.css'

function OrganizacionesPage() {
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const { organizaciones, cargando, error, recargar, guardar, alternar } = useOrganizaciones()
  const [form, setForm] = useState<{ abierto: boolean; editando: Organizacion | null }>(
    { abierto: false, editando: null },
  )

  const resumen = useMemo(() => resumirOrganizaciones(organizaciones), [organizaciones])

  // Se sugieren los planes ya en uso en vez de una escala inventada: hoy el
  // campo es texto libre en el backend y no gobierna ninguna restricción.
  const planesConocidos = useMemo(() => {
    const vistos = new Map<string, string>()
    organizaciones.forEach((item) => {
      const clave = normalizarPlan(item.plan)
      if (clave && !vistos.has(clave)) vistos.set(clave, item.plan.trim())
    })
    return [...vistos.values()].sort()
  }, [organizaciones])

  const stats: Stat[] = [
    { label: 'Organizaciones', valor: String(resumen.total), icono: <IcUsers size={18} />, tono: 'info' },
    { label: 'Activas', valor: String(resumen.activas), icono: <IcUsers size={18} />, tono: 'ok' },
    { label: 'Granjas en total', valor: String(resumen.granjas), icono: <IcLeaf size={18} />, tono: 'info' },
    { label: 'Usuarios en total', valor: String(resumen.usuarios), icono: <IcUsers size={18} />, tono: 'info' },
  ]

  function suspender(organizacion: Organizacion) {
    if (organizacion.activa && !window.confirm(
      `¿Suspender a ${organizacion.nombre}? Sus usuarios dejarán de poder entrar, pero no se borra nada.`,
    )) return
    void alternar(organizacion)
  }

  return (
    <div className="page-container org-page adm-page">
      <CabeceraAdmin
        eyebrow="Plataforma"
        titulo="Organizaciones"
        subtitulo="Las empresas que usan Avisens. De cada una cuelgan sus usuarios y sus granjas."
        acciones={(
          <>
            <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void recargar()} disabled={cargando}>
              <IcRefresh size={16} aria-hidden="true" />
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            {puedeGestionar && (
              <button type="button" className="adm-btn adm-btn--primario" onClick={() => setForm({ abierto: true, editando: null })}>
                Nueva organización
              </button>
            )}
          </>
        )}
      />

      <TarjetasResumen stats={stats} etiqueta="Resumen de organizaciones" />

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      <section className="adm-panel" aria-label="Listado de organizaciones">
        {cargando ? (
          <p className="org-vacio" role="status">Cargando organizaciones…</p>
        ) : organizaciones.length === 0 ? (
          <div className="org-vacio">
            <h2>Todavía no hay organizaciones</h2>
            <p>Cada empresa cliente es una organización. Se crea una sola vez, al dar de alta al cliente.</p>
          </div>
        ) : (
          <div className="org-tabla-scroll">
            <table className="org-tabla">
              <thead>
                <tr>
                  <th scope="col">Organización</th>
                  <th scope="col">NIT</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Granjas</th>
                  <th scope="col">Usuarios</th>
                  <th scope="col">Cliente desde</th>
                  <th scope="col">Estado</th>
                  {puedeGestionar && <th scope="col"><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {organizaciones.map((organizacion) => (
                  <tr key={organizacion.id} className={organizacion.activa ? '' : 'org-fila--suspendida'}>
                    <td><strong>{organizacion.nombre}</strong></td>
                    <td>{organizacion.nit ?? '—'}</td>
                    <td><span className="org-plan">{etiquetaPlan(organizacion.plan)}</span></td>
                    <td className="org-num">{organizacion._count.granjas}</td>
                    <td className="org-num">{organizacion._count.usuarios}</td>
                    <td>{fechaCorta(organizacion.fecha_creacion)}</td>
                    <td>
                      <span className={`org-estado org-estado--${organizacion.activa ? 'activa' : 'suspendida'}`}>
                        {organizacion.activa ? 'Activa' : 'Suspendida'}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td className="org-acciones">
                        <button type="button" className="adm-btn-fila" onClick={() => setForm({ abierto: true, editando: organizacion })}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`adm-btn-fila${organizacion.activa ? ' adm-btn-fila--peligro' : ''}`}
                          onClick={() => suspender(organizacion)}
                        >
                          {organizacion.activa ? 'Suspender' : 'Reactivar'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form.abierto && (
        <FormularioOrganizacion
          editando={form.editando}
          planesConocidos={planesConocidos}
          onGuardar={guardar}
          onCerrar={() => setForm({ abierto: false, editando: null })}
        />
      )}
    </div>
  )
}

export default OrganizacionesPage
