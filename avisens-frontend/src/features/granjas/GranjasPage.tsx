import { useMemo } from 'react'
import { getRol } from '@shared/api'
import type { Granja } from './api/granjas'
import FormularioGranja from './components/FormularioGranja'
import ExplorarProduccionGranja from './components/ExplorarProduccionGranja'
import ListaGranjas from './components/ListaGranjas'
import ResumenGranjas from './components/ResumenGranjas'
import { useFormularioGranja } from './hooks/useFormularioGranja'
import { useGranjas } from './hooks/useGranjas'
import { usePropietariosGranja } from './hooks/usePropietariosGranja'
import { calcularResumenGranjas } from './model/granjaVista'
import './GranjasPage.css'

function GranjasPage() {
  const esAdministrador = getRol() === 'Administrador'
  const gestion = useGranjas()
  const formulario = useFormularioGranja(gestion.guardar)
  const catalogoPropietarios = usePropietariosGranja(esAdministrador)
  const resumen = useMemo(
    () => calcularResumenGranjas(gestion.granjas),
    [gestion.granjas],
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
            onClick={formulario.abrirCrear}
          >
            + Nueva granja
          </button>
        )}
      </header>
      <ResumenGranjas resumen={resumen} />
      <ExplorarProduccionGranja />
      {gestion.error && (
        <div className="grj-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>
            Reintentar
          </button>
        </div>
      )}
      {gestion.cargando ? (
        <p className="grj-vacio">Cargando granjas…</p>
      ) : (
        <ListaGranjas
          granjas={gestion.granjas}
          onEditar={formulario.abrirEditar}
          onAlternar={(granja) => void gestion.alternarActivo(granja)}
          onEliminar={confirmarEliminacion}
        />
      )}
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
