import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDeGestion, ROL_ADMIN } from '@shared/auth/permisos'
import { IcPlus } from '@shared/ui/icons/icons'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import '@shared/ui/admin/AdminKit.css'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { Granja } from './api/granjas'
import FormularioGranja from './components/FormularioGranja'
import TablaGranjas from './components/TablaGranjas'
import ResumenGranjas from './components/ResumenGranjas'
import TableroImplementacionGranjas from './components/TableroImplementacionGranjas'
import { useFormularioGranja } from './hooks/useFormularioGranja'
import { useGranjas } from './hooks/useGranjas'
import { usePropietariosGranja } from './hooks/usePropietariosGranja'
import { calcularEtapasImplementacionGranjas, calcularResumenGranjas } from './model/granjaVista'
import './GranjasPage.css'

function GranjasPage() {
  const navigate = useNavigate()
  const rol = getRol()
  const esAdministrador = rol === ROL_ADMIN
  const permisos = permisosDeGestion(rol)
  const gestion = useGranjas()
  const formulario = useFormularioGranja(gestion.guardar)
  const catalogoPropietarios = usePropietariosGranja(esAdministrador)
  const monitoreo = useMonitoreoAmbiental()
  const resumen = useMemo(
    () => calcularResumenGranjas(gestion.granjas),
    [gestion.granjas],
  )
  const etapasImplementacion = useMemo(
    () => calcularEtapasImplementacionGranjas(
      catalogoPropietarios.propietarios,
      gestion.granjas,
      monitoreo.galpones,
    ),
    [catalogoPropietarios.propietarios, gestion.granjas, monitoreo.galpones],
  )

  function confirmarEliminacion(granja: Granja) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente la granja "${granja.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void gestion.eliminar(granja)
  }

  return (
    <div className="page-container adm-page">
      <CabeceraAdmin
        eyebrow={esAdministrador ? 'Panel de administración' : 'Mi operación'}
        titulo="Granjas"
        subtitulo={
          esAdministrador
            ? 'Registra las sedes productivas y asígnalas a su propietario. De aquí cuelgan los galpones y, dentro de ellos, los lotes.'
            : 'Consulta las sedes productivas a tu cargo y entra a sus galpones.'
        }
        migas={[{ label: 'Granjas' }]}
        acciones={
          permisos.crear && (
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={() => formulario.abrirCrear()}
            >
              <IcPlus size={15} aria-hidden="true" />
              Nueva granja
            </button>
          )
        }
      />

      <ResumenGranjas resumen={resumen} />

      {esAdministrador && (
        <TableroImplementacionGranjas
          etapas={etapasImplementacion}
          cargando={gestion.cargando || catalogoPropietarios.cargando || monitoreo.cargando}
          onAsignarGranja={formulario.abrirCrear}
          onAbrirGranja={(granjaId) => navigate(`/galpones?granja=${granjaId}`)}
        />
      )}

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>
            Reintentar
          </button>
        </div>
      )}

      <section className="adm-panel" aria-label="Listado de granjas">
        <TablaGranjas
          granjas={gestion.granjas}
          cargando={gestion.cargando}
          onEditar={formulario.abrirEditar}
          onAlternar={(granja) => void gestion.alternarActivo(granja)}
          onEliminar={confirmarEliminacion}
          onVerGalpones={(granja) => navigate(`/galpones?granja=${granja.id}`)}
          permisos={permisos}
        />
      </section>

      {formulario.abierto && (
        <FormularioGranja
          form={formulario.form}
          modoEdicion={formulario.modoEdicion}
          esAdministrador={esAdministrador}
          propietarios={catalogoPropietarios.propietarios}
          cargandoPropietarios={catalogoPropietarios.cargando}
          errorPropietarios={catalogoPropietarios.error}
          guardando={formulario.guardando}
          error={formulario.error}
          onCambiar={formulario.cambiar}
          onGuardar={formulario.guardar}
          onCerrar={formulario.cerrar}
        />
      )}
    </div>
  )
}

export default GranjasPage
