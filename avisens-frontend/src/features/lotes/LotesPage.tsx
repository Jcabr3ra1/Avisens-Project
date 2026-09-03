import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
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
import { evaluarAltaDeLote } from './model/loteVista'

function LotesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gestion = useLotes()
  const permisos = permisosDeGestion(getRol())
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

  const galponActivo = galponesDisponibles.find((galpon) => galpon.activo)
  const { puedeCrear, motivoBloqueo } = evaluarAltaDeLote(galponesDisponibles)

  const migas: Miga[] = galponSeleccionado
    ? [
        { label: 'Granjas', to: '/granjas' },
        { label: galponSeleccionado.granja.nombre, to: `/galpones?granja=${galponSeleccionado.granja.id}` },
        { label: galponSeleccionado.nombre },
      ]
    : [{ label: 'Granjas', to: '/granjas' }, { label: 'Lotes' }]

  function abrirCrear() {
    if (galponActivo) formulario.abrirCrear(galponActivo.id)
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
            {permisos.crear && (
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                onClick={abrirCrear}
                disabled={!puedeCrear || gestion.cargando}
              >
                <IcPlus size={15} aria-hidden="true" />
                Nuevo lote
              </button>
            )}
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

      {permisos.crear && !gestion.cargando && motivoBloqueo && (
        <p className="adm-aviso">{motivoBloqueo}</p>
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
          permisos={permisos}
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
