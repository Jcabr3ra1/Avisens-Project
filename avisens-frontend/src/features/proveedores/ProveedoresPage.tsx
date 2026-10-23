import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useCallback, useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import { IcChevronDown, IcPlus, IcSearch } from '@shared/ui/icons/icons'
import FormularioProveedor from './components/FormularioProveedor'
import TablaProveedores from './components/TablaProveedores'
import { useFormularioProveedor } from './hooks/useFormularioProveedor'
import { useProveedores } from './hooks/useProveedores'
import type { FormularioProveedor as DatosProveedor, Proveedor } from './model/proveedor'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import Cargando from '@shared/ui/Estados/Cargando'
import '@shared/ui/admin/AdminKit.css'
import './ProveedoresPage.css'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'

const OPCIONES_ESTADO: Array<{ valor: FiltroEstado; etiqueta: string }> = [
  { valor: 'todos', etiqueta: 'Estado: todos' },
  { valor: 'activos', etiqueta: 'Estado: activos' },
  { valor: 'inactivos', etiqueta: 'Estado: inactivos' },
]

function Indicador({ etiqueta, valor, nota }: { etiqueta: string; valor: number | null; nota: string }) {
  return (
    <li className="prv-indicador">
      <span className="prv-indicador-label">{etiqueta}</span>
      <strong className="prv-indicador-valor">{valor ?? '—'}</strong>
      <span className="prv-indicador-nota">{nota}</span>
    </li>
  )
}

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

  const confirmarEliminacion = async (proveedor: Proveedor) => {
    const confirmado = (await confirmarAccion({
      titulo: '¿Eliminar este proveedor?',
      entidad: proveedor.nombre,
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar proveedor',
      tono: 'peligro',
    }))
    if (confirmado) void gestion.eliminar(proveedor)
  }

  const { proveedores, cargando } = gestion
  const activos = proveedores.filter((proveedor) => proveedor.activo).length
  const sinContacto = proveedores.filter((proveedor) => !proveedor.telefono && !proveedor.email).length
  const tipos = new Set(proveedores.map((proveedor) => proveedor.tipo_proveedor).filter(Boolean)).size
  const listo = !cargando && !gestion.error

  return (
    <div className="page-container prv-page adm-page">
      <header className="prv-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Abastecimiento
          </span>
          <h1 className="prv-titulo">Proveedores</h1>
          <p className="prv-subtitulo">Aliados de alimento, pollitos, insumos y servicios.</p>
        </div>
        <button type="button" className="prv-boton-nuevo" onClick={formulario.abrirCrear}>
          <IcPlus size={17} aria-hidden="true" />
          Nuevo proveedor
        </button>
      </header>

      <ul className="prv-indicadores" aria-label="Resumen de proveedores">
        <Indicador etiqueta="Proveedores" valor={listo ? proveedores.length : null} nota="Registrados en total" />
        <Indicador etiqueta="Activos" valor={listo ? activos : null} nota={proveedores.length - activos === 1 ? '1 inactivo' : `${proveedores.length - activos} inactivos`} />
        <Indicador etiqueta="Tipos" valor={listo ? tipos : null} nota="Clasificaciones distintas" />
        <Indicador etiqueta="Sin contacto" valor={listo ? sinContacto : null} nota="Sin teléfono ni correo" />
      </ul>

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!cargando && proveedores.length > 0 && (
        <div className="prv-herramientas">
          <label className="prv-buscador">
            <span className="sr-only">Buscar proveedor</span>
            <IcSearch size={17} aria-hidden="true" />
            <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, NIT o contacto…" autoComplete="off" />
          </label>
          <label className="prv-desplegable">
            <span className="sr-only">Filtrar por estado</span>
            <select value={estado} onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}>
              {OPCIONES_ESTADO.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
            </select>
            <IcChevronDown size={17} aria-hidden="true" />
          </label>
          <span className="prv-conteo">{visibles.length} de {proveedores.length}</span>
        </div>
      )}

      <section className="prv-listado" aria-label="Directorio de proveedores">
        {cargando ? (
          <Cargando texto="Cargando proveedores…" />
        ) : proveedores.length === 0 ? (
          <EstadoVacio
            titulo="Aún no hay proveedores"
            texto="Registra el primero para relacionarlo con lotes, insumos y compras."
            accion={(
              <button type="button" className="adm-btn adm-btn--primario" onClick={formulario.abrirCrear}>
                <IcPlus size={16} aria-hidden="true" />
                Nuevo proveedor
              </button>
            )}
          />
        ) : visibles.length === 0 ? (
          <EstadoVacio
            titulo="No encontramos proveedores"
            texto="Prueba cambiando la búsqueda o el filtro de estado."
            accion={<button type="button" className="adm-btn adm-btn--secundario" onClick={() => { setBusqueda(''); setEstado('todos') }}>Limpiar filtros</button>}
          />
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
