import { useCallback, useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcPlus } from '@shared/ui/icons/icons'
import FormularioProveedor from './components/FormularioProveedor'
import ResumenProveedores from './components/ResumenProveedores'
import TablaProveedores from './components/TablaProveedores'
import { useFormularioProveedor } from './hooks/useFormularioProveedor'
import { useProveedores } from './hooks/useProveedores'
import type { FormularioProveedor as DatosProveedor, Proveedor } from './model/proveedor'
import '@shared/ui/admin/AdminKit.css'
import './ProveedoresPage.css'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'

const OPCIONES_ESTADO: OpcionFiltro<FiltroEstado>[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'activos', label: 'Activos' },
  { valor: 'inactivos', label: 'Inactivos' },
]

function ProveedoresPage() {
  const gestion = useProveedores()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')

  const guardarProveedor = useCallback(async (form: DatosProveedor, editandoId: number | null) => {
    const datos = {
      nombre: form.nombre.trim(),
      nit: form.nit.trim(),
      tipo_proveedor: form.tipo_proveedor.trim() || undefined,
      contacto_persona: form.contacto_persona.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      email: form.email.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
    }

    try {
      if (editandoId === null) await gestion.crear(datos)
      else await gestion.actualizar(editandoId, datos)
    } catch (err) {
      throw new Error(mensajeDeError(err, 'No se pudo guardar el proveedor.'))
    }
  }, [gestion])

  const formulario = useFormularioProveedor(guardarProveedor)

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es-CO')

    return gestion.proveedores.filter((proveedor) => {
      const coincideEstado = estado === 'todos' || (estado === 'activos' ? proveedor.activo : !proveedor.activo)
      const coincideBusqueda = !termino || [
        proveedor.nombre,
        proveedor.nit,
        proveedor.tipo_proveedor,
        proveedor.contacto_persona,
        proveedor.telefono,
        proveedor.email,
      ].some((valor) => valor?.toLocaleLowerCase('es-CO').includes(termino))

      return coincideEstado && coincideBusqueda
    })
  }, [busqueda, estado, gestion.proveedores])

  const confirmarEliminacion = (proveedor: Proveedor) => {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente a ${proveedor.nombre}? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void gestion.eliminar(proveedor)
  }

  return (
    <div className="page-container prv-page adm-page">
      <CabeceraAdmin
        eyebrow="Abastecimiento"
        titulo="Proveedores"
        subtitulo="Centraliza los aliados de alimento, pollitos, insumos y servicios."
        acciones={(
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={formulario.abrirCrear}
          >
            <IcPlus size={17} aria-hidden="true" />
            Nuevo proveedor
          </button>
        )}
      />

      <ResumenProveedores proveedores={gestion.proveedores} />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      <section className="prv-listado adm-panel" aria-label="Directorio de proveedores">
        {!gestion.cargando && gestion.proveedores.length > 0 && (
          <BarraHerramientas
            busqueda={busqueda}
            placeholder="Buscar por nombre, NIT o contacto"
            etiquetaBusqueda="Buscar proveedor"
            onBuscar={setBusqueda}
            filtro={estado}
            opciones={OPCIONES_ESTADO}
            etiquetaFiltro="Filtrar proveedores por estado"
            onCambiarFiltro={setEstado}
            visibles={visibles.length}
            total={gestion.proveedores.length}
          />
        )}

        {gestion.cargando ? (
          <p className="prv-vacio" role="status">Cargando proveedores…</p>
        ) : gestion.proveedores.length === 0 ? (
          <div className="prv-vacio">
            <h2>Aún no hay proveedores</h2>
            <p>Registra el primero para poder relacionarlo con lotes, insumos y compras.</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="prv-vacio">
            <h2>No encontramos proveedores</h2>
            <p>Prueba cambiando la búsqueda o el filtro de estado.</p>
          </div>
        ) : (
          <TablaProveedores
            proveedores={visibles}
            onEditar={formulario.abrirEditar}
            onAlternarActivo={(proveedor) => void gestion.alternarActivo(proveedor)}
            onEliminar={confirmarEliminacion}
          />
        )}
      </section>

      {formulario.abierto && (
        <FormularioProveedor
          form={formulario.form}
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

export default ProveedoresPage
