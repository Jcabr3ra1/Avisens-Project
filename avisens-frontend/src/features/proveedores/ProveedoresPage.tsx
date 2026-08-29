import { useCallback, useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import BarraProveedores from './components/BarraProveedores'
import FormularioProveedor from './components/FormularioProveedor'
import ResumenProveedores from './components/ResumenProveedores'
import TablaProveedores from './components/TablaProveedores'
import { useFormularioProveedor } from './hooks/useFormularioProveedor'
import { useProveedores } from './hooks/useProveedores'
import type { FormularioProveedor as DatosProveedor, Proveedor } from './model/proveedor'
import './ProveedoresPage.css'

function ProveedoresPage() {
  const gestion = useProveedores()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos')

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
    <div className="page-container prv-page">
      <header className="prv-cabecera">
        <ResumenProveedores proveedores={gestion.proveedores} />
        <button type="button" className="prv-boton-nuevo" onClick={formulario.abrirCrear}>
          + Nuevo proveedor
        </button>
      </header>

      {gestion.error && (
        <div className="prv-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      <section className="prv-listado" aria-label="Directorio de proveedores">
        {!gestion.cargando && gestion.proveedores.length > 0 && (
          <BarraProveedores
            busqueda={busqueda}
            estado={estado}
            visibles={visibles.length}
            total={gestion.proveedores.length}
            onBuscar={setBusqueda}
            onCambiarEstado={setEstado}
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
