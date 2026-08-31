import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gestion = useLotes()
  const galponParam = searchParams.get('galpon')
  const galponId = Number(galponParam)
  const tieneContextoDeGalpon = galponParam !== null && Number.isInteger(galponId)
  const galponSeleccionado = tieneContextoDeGalpon
    ? gestion.galpones.find((galpon) => galpon.id === galponId)
    : undefined
  const galponesDisponibles = galponSeleccionado
    ? [galponSeleccionado]
    : tieneContextoDeGalpon
      ? []
      : gestion.galpones
  const lotesDelGalpon = galponSeleccionado
    ? gestion.lotes.filter((lote) => lote.galpon.id === galponSeleccionado.id)
    : tieneContextoDeGalpon
      ? []
      : gestion.lotes
  const filtro = useFiltroLotes(lotesDelGalpon)
  const resumen = useResumenLotes(lotesDelGalpon)
  const formulario = useFormularioLote(gestion.guardar)
  const catalogosDisponibles = galponesDisponibles.length > 0 && gestion.proveedores.length > 0

  function abrirCrear() {
    const galponId = galponesDisponibles.find((galpon) => galpon.activo)?.id
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
          <h1>{galponSeleccionado ? `Lotes · ${galponSeleccionado.nombre}` : 'Lotes'}</h1>
          <p>{galponSeleccionado ? 'Gestiona los grupos de aves de este galpón.' : 'Gestiona los grupos de aves asociados a cada galpón.'}</p>
        </div>
        <div className="lotes-header-acciones">
          {galponSeleccionado && (
            <button type="button" className="lotes-btn-secondary" onClick={() => navigate(`/galpones?granja=${galponSeleccionado.granja.id}`)}>
              Volver a galpones
            </button>
          )}
          <button type="button" className="lotes-btn-primary" onClick={abrirCrear} disabled={!catalogosDisponibles || gestion.cargando}>
            + Nuevo lote
          </button>
        </div>
      </header>

      <ResumenLotes resumen={resumen} />

      {gestion.error && (
        <div className="lotes-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!gestion.cargando && !catalogosDisponibles && (
        <p className="lotes-aviso">Necesitas un galpón activo y un proveedor para crear lotes.</p>
      )}

      <section className="lotes-card" aria-label="Listado de lotes">
        {lotesDelGalpon.length > 0 && (
          <BarraLotes
            busqueda={filtro.busqueda}
            estado={filtro.estado}
            visibles={filtro.visibles.length}
            total={lotesDelGalpon.length}
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
          galpones={galponesDisponibles}
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
