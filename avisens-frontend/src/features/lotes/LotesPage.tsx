import { useNavigate, useSearchParams } from 'react-router-dom'
import { IcPlus } from '@shared/ui/icons/icons'
import CabeceraAdmin, { type Miga } from '@shared/ui/admin/CabeceraAdmin'
import '@shared/ui/admin/AdminKit.css'
import type { Lote } from './api/lotes'
import BarraLotes from './components/BarraLotes'
import FormularioLote from './components/FormularioLote'
import ResumenLotes from './components/ResumenLotes'
import TablaLotes from './components/TablaLotes'
import { useFiltroLotes } from './hooks/useFiltroLotes'
import { useFormularioLote } from './hooks/useFormularioLote'
import { useLotes } from './hooks/useLotes'
import { useResumenLotes } from './hooks/useResumenLotes'

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

  const migas: Miga[] = galponSeleccionado
    ? [
        { label: 'Granjas', to: '/granjas' },
        { label: galponSeleccionado.granja.nombre, to: `/galpones?granja=${galponSeleccionado.granja.id}` },
        { label: galponSeleccionado.nombre },
      ]
    : [{ label: 'Granjas', to: '/granjas' }, { label: 'Lotes' }]

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
    <div className="page-container adm-page">
      <CabeceraAdmin
        titulo="Lotes"
        contexto={galponSeleccionado?.nombre}
        subtitulo={
          galponSeleccionado
            ? 'Los grupos de aves alojados en este galpón. Cada lote es la unidad sobre la que se mide el desempeño productivo.'
            : 'Los grupos de aves asociados a cada galpón: ingreso, cantidad y estado del ciclo.'
        }
        migas={migas}
        acciones={
          <>
            {galponSeleccionado && (
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => navigate(`/galpones?granja=${galponSeleccionado.granja.id}`)}
              >
                Volver a galpones
              </button>
            )}
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={abrirCrear}
              disabled={!catalogosDisponibles || gestion.cargando}
            >
              <IcPlus size={15} aria-hidden="true" />
              Nuevo lote
            </button>
          </>
        }
      />

      <ResumenLotes resumen={resumen} />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!gestion.cargando && !catalogosDisponibles && (
        <p className="adm-aviso">Necesitas un galpón activo y un proveedor para crear lotes.</p>
      )}

      <section className="adm-panel" aria-label="Listado de lotes">
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
