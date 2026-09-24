import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN, ROL_PROPIETARIO } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcPlus, IcRefresh } from '@shared/ui/icons/icons'
import FormularioMedicamento from './components/FormularioMedicamento'
import FiltrosMedicinas from './components/FiltrosMedicinas'
import HistorialMedicinas from './components/HistorialMedicinas'
import { useFormularioMedicamento } from './hooks/UseFormularioMedicamento'
import { useMedicinas } from './hooks/useMedicinas'
import {
  filtrarMedicinas,
  type FiltroTipo,
} from './model/medicinas'
import './MedicinasPage.css'
import '@shared/ui/admin/AdminKit.css'

function MedicinasPage() {
  const gestion = useMedicinas()
  const formulario = useFormularioMedicamento(gestion.guardar)

  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [loteId, setLoteId] = useState(0)

  const rol = getRol()
  const puedeGestionar = rol === ROL_ADMIN || rol === ROL_PROPIETARIO

  const permisos = {
    editar: puedeGestionar,
    eliminar: puedeGestionar,
  }

  const visibles = useMemo(() => {
    const registro = filtrarMedicinas(
      gestion.eventos,
      busqueda,
      loteId || null,
    )

    return tipo === 'todos'
      ? registro
      : registro.filter((evento) => evento.tipo === tipo)
  }, [busqueda, gestion.eventos, loteId, tipo])

  function confirmarEliminacion(id: number, titulo: string) {
    const confirmado = window.confirm(
      `¿Eliminar el registro "${titulo}"? Esta acción no se puede deshacer.`,
    )

    if (!confirmado) return

    const evento = gestion.eventos.find((item) => item.id === id)
    if (evento) void gestion.eliminar(evento)
  }

  return (
    <div className="page-container med-page adm-page">
      <CabeceraAdmin
        eyebrow="Control sanitario"
        titulo="Medicinas"
        subtitulo="Registra vacunas, tratamientos y diagnósticos de cada lote."
        acciones={
          <>
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => void gestion.recargar()}
            >
              <IcRefresh size={15} aria-hidden="true" />
              Actualizar
            </button>

            {puedeGestionar && (
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                onClick={formulario.abrirCrear}
                disabled={!gestion.catalogosListos || gestion.lotes.length === 0}
              >
                <IcPlus size={15} aria-hidden="true" />
                Registrar medicina
              </button>
            )}
          </>
        }
      />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>
            Reintentar
          </button>
        </div>
      )}

      {gestion.avisoCatalogos && (
        <p className="adm-aviso">{gestion.avisoCatalogos}</p>
      )}

      {gestion.eventos.length > 0 && (
        <FiltrosMedicinas
          busqueda={busqueda}
          onBuscar={setBusqueda}
          tipo={tipo}
          onCambiarTipo={setTipo}
          loteId={loteId}
          onCambiarLote={setLoteId}
          lotes={gestion.lotes}
          visibles={visibles.length}
          total={gestion.eventos.length}
        />
      )}

      {gestion.cargando && gestion.eventos.length === 0 ? (
        <p className="med-cargando">Cargando historial sanitario…</p>
      ) : gestion.eventos.length === 0 ? (
        <section className="med-vacio">
          <h2>Aún no hay registros sanitarios</h2>
          <p>Registra una vacuna, tratamiento o diagnóstico para comenzar.</p>
        </section>
      ) : visibles.length === 0 ? (
        <section className="med-vacio">
          <h2>No hay resultados</h2>
          <p>Ningún registro coincide con la búsqueda o los filtros elegidos.</p>
        </section>
      ) : (
        <section className="med-panel" aria-label="Historial sanitario">
          <HistorialMedicinas
            eventos={visibles}
            permisos={permisos}
            onEditar={formulario.abrirEditar}
            onEliminar={(evento) =>
              confirmarEliminacion(
                evento.id,
                evento.producto ?? evento.diagnostico ?? 'registro sanitario',
              )
            }
          />
        </section>
      )}

      {formulario.abierto && (
        <FormularioMedicamento
          form={formulario.form}
          lotes={gestion.lotes}
          insumos={gestion.insumos}
          modoEdicion={formulario.modoEdicion}
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

export default MedicinasPage
