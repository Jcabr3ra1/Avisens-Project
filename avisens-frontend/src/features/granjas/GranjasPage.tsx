import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
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
  // El rol REAL, no el de vista previa: un admin viendo "como Operario" sigue
  // siendo admin, y la vista previa promete no tocar lo que puede hacer.
  const esAdministrador = getRol() === 'Administrador'
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
    <div className="page-container grj-page">
      <header className="grj-header">
        <div>
          <h1>Granjas</h1>
          <p>Gestiona las sedes productivas de tu organización.</p>
        </div>
        {esAdministrador && (
          <button
            type="button"
            className="grj-btn-primary"
            onClick={() => formulario.abrirCrear()}
          >
            + Nueva granja
          </button>
        )}
      </header>
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
        <div className="grj-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>
            Reintentar
          </button>
        </div>
      )}
      <TablaGranjas
        granjas={gestion.granjas}
        cargando={gestion.cargando}
        onEditar={formulario.abrirEditar}
        onAlternar={(granja) => void gestion.alternarActivo(granja)}
        onEliminar={confirmarEliminacion}
        onVerGalpones={(granja) => navigate(`/galpones?granja=${granja.id}`)}
        puedeGestionar={esAdministrador}
      />
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
