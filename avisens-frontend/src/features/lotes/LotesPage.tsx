import type { Lote } from './api/lotes'
import BarraLotes from './components/BarraLotes'
import FormularioLote from './components/FormularioLote'
import ResumenLotes from './components/ResumenLotes'
import TablaLotes from './components/TablaLotes'
import { useFiltroLotes } from './hooks/useFiltroLotes'
import { useFormularioLote } from './hooks/useFormularioLote'
import { useLotes } from './hooks/useLotes'
import { useResumenLotes } from './hooks/useResumenLotes'
import './LotesPage.css'

function LotesPage() {
  const gestion = useLotes()
  const filtro = useFiltroLotes(gestion.lotes)
  const resumen = useResumenLotes(gestion.lotes)
  const formulario = useFormularioLote(gestion.guardar)
  const catalogosDisponibles = gestion.galpones.length > 0 && gestion.proveedores.length > 0

  function abrirCrear() {
    const galponId = gestion.galpones.find((galpon) => galpon.activo)?.id
    const proveedorId = gestion.proveedores[0]?.id
    if (galponId && proveedorId) formulario.abrirCrear(galponId, proveedorId)
  }

  function confirmarEliminacion(lote: Lote) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente el lote "${lote.codigo}"? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void gestion.eliminar(lote)
  }

  return (
    <div className="page-container lotes-page">
      <header className="lotes-header">
        <div>
          <h1>Lotes</h1>
          <p>Gestiona los grupos de aves asociados a cada galpón.</p>
        </div>
        <button type="button" className="lotes-btn-primary" onClick={abrirCrear} disabled={!catalogosDisponibles || gestion.cargando}>
          + Nuevo lote
        </button>
      </header>

      <ResumenLotes resumen={resumen} />

      {gestion.error && (
        <div className="lotes-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!gestion.cargando && !catalogosDisponibles && (
        <p className="lotes-aviso">Necesitas al menos un galpón activo y un proveedor para crear lotes.</p>
      )}

      <section className="lotes-card" aria-label="Listado de lotes">
        {gestion.lotes.length > 0 && (
          <BarraLotes
            busqueda={filtro.busqueda}
            estado={filtro.estado}
            visibles={filtro.visibles.length}
            total={gestion.lotes.length}
            onBuscar={filtro.setBusqueda}
            onCambiarEstado={filtro.setEstado}
          />
        )}
        <TablaLotes
          lotes={filtro.visibles}
          cargando={gestion.cargando}
          onEditar={formulario.abrirEditar}
          onAlternar={(lote) => void gestion.alternarActivo(lote)}
          onEliminar={confirmarEliminacion}
        />
      </section>

      {formulario.abierto && (
        <FormularioLote
          form={formulario.form}
          modoEdicion={formulario.modoEdicion}
          galpones={gestion.galpones}
          proveedores={gestion.proveedores}
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

export default LotesPage
