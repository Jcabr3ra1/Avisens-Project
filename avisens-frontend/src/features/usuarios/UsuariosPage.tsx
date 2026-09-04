import { useCallback, useState } from 'react'
import { getRol, type CrearUsuarioPayload, type Usuario } from '@shared/api'
import { crearOrganizacion } from '@features/organizaciones/api/organizaciones'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcPlus } from '@shared/ui/icons/icons'
import PantallaHija from '@shared/ui/PantallaHija/PantallaHija'
import RecuperacionesDeUsuario from '@features/recuperaciones-password/components/RecuperacionesDeUsuario'
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
import '@shared/ui/admin/AdminKit.css'
import './UsuariosPage.css'

function UsuariosPage() {
  // Rol real: crear usuarios es una acción, no una etiqueta de navegación,
  // así que no debe depender de la vista previa.
  const esPropietario = getRol() === 'Propietario'
  const esAdmin = getRol() === 'Administrador'
  const [usuarioRecuperaciones, setUsuarioRecuperaciones] = useState<Usuario | null>(null)
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
  const {
    roles: rolesCatalogo,
    organizaciones,
    cargando: catalogosCargando,
    error: catalogosError,
    recargar: recargarCatalogos,
  } = catalogos
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

      const rol = rolesCatalogo.find((r) => r.id === datos.rol_id)
      const nombreOrgNueva = datos.organizacion_nombre?.trim() || undefined
      let organizacionId = datos.organizacion_id

      // El backend solo auto-crea la organización cuando el rol es
      // Propietario. Para un Operario dado de alta por el Administrador,
      // si no eligió una organización existente sino que escribió un
      // nombre nuevo, la creamos aquí primero y usamos su id — así el
      // Admin no depende de que ya exista una organización de antes.
      if (rol?.nombre === 'Operario' && !organizacionId && nombreOrgNueva) {
        const nueva = await crearOrganizacion({ nombre: nombreOrgNueva })
        organizacionId = nueva.id
        void recargarCatalogos()
      }

      await crear({
        ...datos,
        nombre_completo: datos.nombre_completo.trim(),
        cedula: datos.cedula.trim(),
        email: datos.email.trim(),
        telefono: telefono || undefined,
        organizacion_id: organizacionId,
        organizacion_nombre: rol?.nombre === 'Propietario' ? nombreOrgNueva : undefined,
      })
    },
    [actualizar, crear, recargarCatalogos, rolesCatalogo],
  )

  const formulario = useFormularioUsuario(guardarUsuario)

  async function abrirCrearUsuario() {
    const roles = rolesCatalogo.length > 0
      ? rolesCatalogo
      : await recargarCatalogos()
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
    <div className="page-container usuarios adm-page">
      <CabeceraAdmin
        eyebrow={esPropietario ? 'Equipo de trabajo' : 'Administración de acceso'}
        titulo={esPropietario ? 'Operarios' : 'Usuarios y roles'}
        subtitulo={esPropietario
          ? 'Gestiona los operarios de tu organización y sus asignaciones.'
          : 'Administra las cuentas, roles y recuperaciones de acceso del sistema.'}
        acciones={(
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => void abrirCrearUsuario()}
            disabled={catalogosCargando}
          >
            <IcPlus size={17} aria-hidden="true" />
            {esPropietario ? 'Nuevo operario' : 'Nuevo usuario'}
          </button>
        )}
      />

      <ResumenUsuarios resumen={resumen} esPropietario={esPropietario} />

      {(error || catalogosError) && (
        <div className="adm-alerta" role="alert">
          <span>{error || catalogosError}</span>
          <button
            type="button"
            onClick={() => void (error ? recargar() : recargarCatalogos())}
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="usuarios-card adm-panel" aria-label="Listado de usuarios">
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
          onRecuperarAcceso={esAdmin ? setUsuarioRecuperaciones : undefined}
        />
      </section>

      {formulario.abierto && (
        <FormularioUsuario
          form={formulario.form}
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          verPassword={formulario.verPassword}
          roles={rolesCatalogo}
          organizaciones={organizaciones}
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

      {usuarioRecuperaciones && (
        <PantallaHija
          titulo={`Recuperar acceso · ${usuarioRecuperaciones.nombre_completo}`}
          subtitulo={usuarioRecuperaciones.email}
          onCerrar={() => setUsuarioRecuperaciones(null)}
        >
          <RecuperacionesDeUsuario usuario={usuarioRecuperaciones} />
        </PantallaHija>
      )}
    </div>
  )
}

export default UsuariosPage
