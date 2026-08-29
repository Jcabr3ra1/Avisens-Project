import { useMemo } from 'react'
import type { Galpon } from './api/galpones'
import BarraGalpones from './components/BarraGalpones'
import FormularioGalpon from './components/FormularioGalpon'
import ResumenGalpones from './components/ResumenGalpones'
import TablaGalpones from './components/TablaGalpones'
import { useFiltroGalpones } from './hooks/useFiltroGalpones'
import { useFormularioGalpon } from './hooks/useFormularioGalpon'
import { useGalpones } from './hooks/useGalpones'
import { calcularResumenGalpones } from './model/galponVista'
import './GalponesPage.css'

function GalponesPage() {
  const gestion = useGalpones()
  const filtro = useFiltroGalpones(gestion.galpones)
  const formulario = useFormularioGalpon(gestion.guardar)
  const resumen = useMemo(() => calcularResumenGalpones(gestion.galpones), [gestion.galpones])

  function abrirCrear() {
    const granjaId = gestion.granjas[0]?.id
    if (granjaId) formulario.abrirCrear(granjaId)
  }

  function confirmarEliminacion(galpon: Galpon) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente el galpón "${galpon.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void gestion.eliminar(galpon)
  }

  return (
    <div className="page-container galpones-page">
      <header className="galpones-header">
        <div>
          <h1>Galpones</h1>
          <p>Gestiona la capacidad y las características físicas de cada galpón.</p>
        </div>
        <button type="button" className="galpones-btn-primary" onClick={abrirCrear} disabled={gestion.cargando || gestion.granjas.length === 0}>+ Nuevo galpón</button>
      </header>

      <ResumenGalpones resumen={resumen} />

      {gestion.error && (
        <div className="galpones-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!gestion.cargando && gestion.granjas.length === 0 && <p className="galpones-aviso">Necesitas una granja activa antes de registrar galpones.</p>}

      <section className="galpones-card" aria-label="Listado de galpones">
        {gestion.galpones.length > 0 && (
          <BarraGalpones busqueda={filtro.busqueda} estado={filtro.estado} visibles={filtro.visibles.length} total={gestion.galpones.length} onBuscar={filtro.setBusqueda} onCambiarEstado={filtro.setEstado} />
        )}
        <TablaGalpones galpones={filtro.visibles} cargando={gestion.cargando} onEditar={formulario.abrirEditar} onAlternar={(galpon) => void gestion.alternarActivo(galpon)} onEliminar={confirmarEliminacion} />
      </section>

      {formulario.abierto && (
        <FormularioGalpon form={formulario.form} modoEdicion={formulario.modoEdicion} granjas={gestion.granjas} guardando={formulario.guardando} error={formulario.error} onCambiar={formulario.cambiar} onGuardar={formulario.guardar} onCerrar={formulario.cerrar} />
      )}
    </div>
  )
}

export default GalponesPage
