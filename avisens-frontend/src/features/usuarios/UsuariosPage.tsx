import { useCallback } from 'react'
import { getRol, type CrearUsuarioPayload, type Usuario } from '@shared/api'
import BarraUsuarios from './components/BarraUsuarios'
import FormularioUsuario from './components/FormularioUsuario'
import ModalAsignacionesGalpon from './components/ModalAsignacionesGalpon'
import ResumenUsuarios from './components/ResumenUsuarios'
import TablaUsuarios from './components/TablaUsuarios'
import { useCatalogosUsuarios } from './hooks/useCatalogosUsuarios'
import { useAsignacionesGalpon } from './hooks/useAsignacionesGalpon'
import { useFiltroUsuarios } from './hooks/useFiltroUsuarios'
import { useFormularioUsuario } from './hooks/useFormularioUsuario'
import { useResumenUsuarios } from './hooks/useResumenUsuarios'
import { useUsuarios } from './hooks/useUsuarios'
import './UsuariosPage.css'

function UsuariosPage() {
  const esPropietario = getRol() === 'Propietario'
  const {
    usuarios,
    cargando,
    error,
    recargar,
    crear,
    actualizar,
    alternarActivo,
    eliminar,
  } = useUsuarios()
  const catalogos = useCatalogosUsuarios(esPropietario)
  const asignaciones = useAsignacionesGalpon()
  const filtro = useFiltroUsuarios(usuarios)
  const resumen = useResumenUsuarios(usuarios)

  const guardarUsuario = useCallback(
    async (datos: CrearUsuarioPayload, editandoId: number | null) => {
      const telefono = datos.telefono?.trim()

      if (editandoId !== null) {
        await actualizar(editandoId, {
          nombre_completo: datos.nombre_completo.trim(),
          cedula: datos.cedula.trim(),
          email: datos.email.trim(),
          telefono: telefono || '',
          rol_id: datos.rol_id,
        })
        return
      }

      await crear({
        ...datos,
        nombre_completo: datos.nombre_completo.trim(),
        cedula: datos.cedula.trim(),
        email: datos.email.trim(),
        telefono: telefono || undefined,
        organizacion_nombre: datos.organizacion_nombre?.trim() || undefined,
      })
    },
    [actualizar, crear],
  )

  const formulario = useFormularioUsuario(guardarUsuario)

  async function abrirCrearUsuario() {
    const roles = catalogos.roles.length > 0
      ? catalogos.roles
      : await catalogos.recargar()
    if (roles.length === 0) return

    formulario.abrirCrear(roles.length === 1 ? roles[0].id : 0)
  }

  function confirmarEliminacion(usuario: Usuario) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente a ${usuario.nombre_completo}? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void eliminar(usuario.id)
  }

  const tituloFormulario = formulario.modoEdicion
    ? `Editar ${esPropietario ? 'operario' : 'usuario'}`
    : `Nuevo ${esPropietario ? 'operario' : 'usuario'}`

  return (
    <div className="page-container usuarios">
      <header className="usuarios-head">
        <div>
          <h1 className="usuarios-title">{esPropietario ? 'Operarios' : 'Usuarios y roles'}</h1>
          <p className="usuarios-sub">
            {esPropietario
              ? 'Gestiona los operarios de tu organización.'
              : 'Gestiona las cuentas que acceden al sistema.'}
          </p>
        </div>
        <button
          type="button"
          className="usuarios-btn-primary"
          onClick={() => void abrirCrearUsuario()}
          disabled={catalogos.cargando}
        >
          + {esPropietario ? 'Nuevo operario' : 'Nuevo usuario'}
        </button>
      </header>

      <ResumenUsuarios resumen={resumen} esPropietario={esPropietario} />

      {(error || catalogos.error) && (
        <div className="usuarios-alert" role="alert">
          <span>{error || catalogos.error}</span>
          <button
            type="button"
            onClick={() => void (error ? recargar() : catalogos.recargar())}
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="usuarios-card" aria-label="Listado de usuarios">
        {!cargando && usuarios.length > 0 && (
          <BarraUsuarios
            busqueda={filtro.busqueda}
            visibles={filtro.visibles.length}
            total={usuarios.length}
            onBuscar={filtro.setBusqueda}
          />
        )}
        <TablaUsuarios
          usuarios={usuarios}
          visibles={filtro.visibles}
          cargando={cargando}
          busqueda={filtro.busqueda}
          onAlternarActivo={(usuario) => void alternarActivo(usuario)}
          onEditar={formulario.abrirEditar}
          onGestionarAsignaciones={(usuario) => void asignaciones.abrir(usuario)}
          onEliminar={confirmarEliminacion}
        />
      </section>

      {formulario.abierto && (
        <FormularioUsuario
          form={formulario.form}
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          verPassword={formulario.verPassword}
          roles={catalogos.roles}
          organizaciones={catalogos.organizaciones}
          rolBloqueado={esPropietario}
          titulo={tituloFormulario}
          onCambiar={formulario.cambiar}
          onAlternarPassword={formulario.alternarPassword}
          onGuardar={formulario.guardar}
          onCerrar={formulario.cerrar}
        />
      )}

      {asignaciones.abierto && asignaciones.usuario && (
        <ModalAsignacionesGalpon
          usuario={asignaciones.usuario}
          asignaciones={asignaciones.asignaciones}
          galpones={asignaciones.galpones}
          cargando={asignaciones.cargando}
          guardando={asignaciones.guardando}
          error={asignaciones.error}
          onCerrar={asignaciones.cerrar}
          onAsignar={asignaciones.asignar}
          onRetirar={asignaciones.retirar}
        />
      )}
    </div>
  )
}

export default UsuariosPage
