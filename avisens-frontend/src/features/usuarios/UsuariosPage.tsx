import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRol, type CrearUsuarioPayload, type Usuario } from '@shared/api'
import { crearOrganizacion } from '@features/organizaciones/api/organizaciones'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { listarAsignacionesGalpon } from './api/asignacionesGalpon'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcChevronRight, IcPlus, IcSearch, IcUsers } from '@shared/ui/icons/icons'
import PantallaHija from '@shared/ui/PantallaHija/PantallaHija'
import RecuperacionesDeUsuario from '@features/recuperaciones-password/components/RecuperacionesDeUsuario'
import BarraUsuarios from './components/BarraUsuarios'
import FormularioUsuario from './components/FormularioUsuario'
import ModalAsignacionesGalpon from './components/ModalAsignacionesGalpon'
import PanelUsuario from './components/PanelUsuario'
import ResumenUsuarios from './components/ResumenUsuarios'
import { useCatalogosUsuarios } from './hooks/useCatalogosUsuarios'
import { useAsignacionesGalpon } from './hooks/useAsignacionesGalpon'
import { useFiltroUsuarios } from './hooks/useFiltroUsuarios'
import { useFormularioUsuario } from './hooks/useFormularioUsuario'
import { useResumenUsuarios } from './hooks/useResumenUsuarios'
import { useUsuarios } from './hooks/useUsuarios'
import { siguienteUsuarioId } from './model/directorioUsuarios'
import '@shared/ui/admin/AdminKit.css'
import './UsuariosPage.css'

type RolSeccion = {
  rol: 'Administrador' | 'Propietario' | 'Operario'
  titulo: string
  subtitulo: string
  botonCrear: string
  tono: 'administrador' | 'propietario' | 'operario'
}

const SECCIONES_ROL: RolSeccion[] = [
  {
    rol: 'Administrador',
    titulo: 'Administradores',
    subtitulo: 'Gobierno global de la plataforma y soporte',
    botonCrear: 'Nuevo administrador',
    tono: 'administrador',
  },
  {
    rol: 'Propietario',
    titulo: 'Propietarios',
    subtitulo: 'Titulares de empresas, granjas y finanzas',
    botonCrear: 'Nuevo propietario',
    tono: 'propietario',
  },
  {
    rol: 'Operario',
    titulo: 'Operarios',
    subtitulo: 'Personal de campo asignado a galpones',
    botonCrear: 'Nuevo operario',
    tono: 'operario',
  },
]

function iniciales(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || 'U'
  )
}

function UsuariosPage() {
  const esPropietario = getRol() === 'Propietario'
  const esAdmin = getRol() === 'Administrador'
  const [parametros, setParametros] = useSearchParams()
  const [usuarioRecuperaciones, setUsuarioRecuperaciones] = useState<Usuario | null>(null)
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false)
  const buscadorRef = useRef<HTMLInputElement>(null)

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

  useRefetchOnFocus(() => { void recargar(true) })

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
  const [galpones, setGalpones] = useState<Galpon[]>([])

  useEffect(() => {
    if (esPropietario) {
      void listarGalpones().then(setGalpones).catch(() => setGalpones([]))
    }
  }, [esPropietario])

  useEffect(() => {
    function atajoBuscar(evento: globalThis.KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement) return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', atajoBuscar)
    return () => window.removeEventListener('keydown', atajoBuscar)
  }, [])

  const seccionesVisibles = useMemo(() => {
    const base = esPropietario
      ? SECCIONES_ROL.filter((s) => s.rol === 'Operario')
      : filtro.rolFiltro === 'todos'
        ? SECCIONES_ROL
        : SECCIONES_ROL.filter((s) => s.rol === filtro.rolFiltro)

    return base
      .map((seccion) => ({
        ...seccion,
        cuentas: filtro.visibles.filter((u) => u.rol.nombre === seccion.rol),
      }))
      .filter((seccion) => seccion.cuentas.length > 0 || filtro.rolFiltro === seccion.rol)
  }, [esPropietario, filtro.rolFiltro, filtro.visibles])

  const listaOrdenada = useMemo(
    () => seccionesVisibles.flatMap((seccion) => seccion.cuentas),
    [seccionesVisibles],
  )
  const idsVisibles = useMemo(() => listaOrdenada.map((u) => u.id), [listaOrdenada])
  const idPedido = Number(parametros.get('usuario'))
  const seleccionado = listaOrdenada.find((u) => u.id === idPedido) ?? listaOrdenada[0] ?? null
  const hayFiltros = filtro.busqueda.trim() !== '' || filtro.estadoFiltro !== 'todos' || filtro.rolFiltro !== 'todos'

  function seleccionar(id: number, abrirEnMovil = false) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('usuario', String(id))
      return siguientes
    }, { replace: true })
    if (abrirEnMovil && window.matchMedia('(max-width: 64rem)').matches) {
      setPanelMovilAbierto(true)
    }
  }

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguienteId = siguienteUsuarioId(idsVisibles, seleccionado?.id ?? null, evento.key)
    if (siguienteId === null) return
    evento.preventDefault()
    seleccionar(siguienteId, false)
  }

  const guardarUsuario = useCallback(
    async (datos: CrearUsuarioPayload, editandoId: number | null) => {
      const telefono = datos.telefono?.trim()

      if (editandoId !== null) {
        await actualizar(editandoId, {
          nombre_completo: datos.nombre_completo.trim(),
          cedula: datos.cedula.trim(),
          username: datos.username.trim().toLowerCase(),
          email: datos.email?.trim().toLowerCase() || null,
          telefono: telefono || '',
          rol_id: datos.rol_id,
          galpon_ids: datos.galpon_ids,
        })
        return
      }

      const rol = rolesCatalogo.find((r) => r.id === datos.rol_id)
      const nombreOrgNueva = datos.organizacion_nombre?.trim() || undefined
      let organizacionId = datos.organizacion_id

      if (rol?.nombre === 'Operario' && !organizacionId && nombreOrgNueva) {
        const nueva = await crearOrganizacion({ nombre: nombreOrgNueva })
        organizacionId = nueva.id
        void recargarCatalogos()
      }

      await crear({
        ...datos,
        nombre_completo: datos.nombre_completo.trim(),
        cedula: datos.cedula.trim(),
        username: datos.username.trim().toLowerCase(),
        email: datos.email?.trim().toLowerCase() || null,
        telefono: telefono || undefined,
        organizacion_id: organizacionId,
        organizacion_nombre: rol?.nombre === 'Propietario' ? nombreOrgNueva : undefined,
        galpon_ids: datos.galpon_ids,
      })
    },
    [actualizar, crear, recargarCatalogos, rolesCatalogo],
  )

  const formulario = useFormularioUsuario(guardarUsuario)

  async function abrirEditarUsuario(usuario: Usuario) {
    let galponIds = usuario.usuarios_galpones?.map((a) => a.galpon_id) ?? []
    if (galponIds.length === 0 && esPropietario) {
      try {
        const asignacionesActuales = await listarAsignacionesGalpon(usuario.id)
        galponIds = asignacionesActuales.filter((a) => a.activa).map((a) => a.galpon_id)
      } catch {
        // si falla, abrir con array vacío
      }
    }
    formulario.abrirEditar(usuario, galponIds)
  }

  async function abrirCrearUsuario(nombreRolPreseleccionado?: 'Administrador' | 'Propietario' | 'Operario') {
    const roles = rolesCatalogo.length > 0
      ? rolesCatalogo
      : await recargarCatalogos()
    if (roles.length === 0) return

    if (esPropietario) {
      const rolOperario = roles.find((r) => r.nombre === 'Operario')
      formulario.abrirCrear(rolOperario ? rolOperario.id : 0)
      return
    }

    if (nombreRolPreseleccionado) {
      const encontrado = roles.find((r) => r.nombre === nombreRolPreseleccionado)
      formulario.abrirCrear(encontrado ? encontrado.id : 0)
      return
    }

    formulario.abrirCrear(roles.length === 1 ? roles[0].id : 0)
  }

  async function confirmarEliminacion(usuario: Usuario) {
    const confirmado = await confirmarAccion({
      titulo: '¿Eliminar este usuario?',
      entidad: usuario.nombre_completo,
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar usuario',
      tono: 'peligro',
    })
    if (confirmado) {
      setPanelMovilAbierto(false)
      void eliminar(usuario.id)
    }
  }

  const tituloFormulario = formulario.modoEdicion
    ? `Editar ${esPropietario ? 'operario' : 'persona'}`
    : `Registrar ${esPropietario ? 'operario' : 'persona'}`

  return (
    <div className="page-container usuarios adm-page">
      <header className="usuarios-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            {esPropietario ? 'Equipo de trabajo' : 'Plataforma · Control de acceso'}
          </span>
          <h1 className="usuarios-titulo">{esPropietario ? 'Operarios' : 'Personas y roles'}</h1>
          <p className="usuarios-subtitulo">
            {esPropietario
              ? 'Gestiona los operarios de tu organización y sus asignaciones a galpón.'
              : 'Cuentas del sistema por nivel de responsabilidad: administradores, propietarios y operarios.'}
          </p>
        </div>
        <button
          type="button"
          className="usuarios-boton-nuevo"
          onClick={() => void abrirCrearUsuario(
            filtro.rolFiltro !== 'todos' ? filtro.rolFiltro : undefined,
          )}
          disabled={catalogosCargando}
        >
          <IcPlus size={17} aria-hidden="true" />
          {esPropietario ? 'Registrar operario' : 'Registrar persona'}
        </button>
      </header>

      <ResumenUsuarios
        resumen={resumen}
        esPropietario={esPropietario}
        rolActivo={filtro.rolFiltro}
        estadoActivo={filtro.estadoFiltro}
        onSeleccionarRol={filtro.setRolFiltro}
        onSeleccionarEstado={filtro.setEstadoFiltro}
      />

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

      {!cargando && usuarios.length > 0 && (
        <BarraUsuarios
          buscadorRef={buscadorRef}
          busqueda={filtro.busqueda}
          visibles={filtro.visibles.length}
          total={usuarios.length}
          esPropietario={esPropietario}
          estadoFiltro={filtro.estadoFiltro}
          hayFiltros={hayFiltros}
          onBuscar={filtro.setBusqueda}
          onCambiarEstado={filtro.setEstadoFiltro}
          onLimpiar={filtro.limpiarFiltros}
        />
      )}

      <div className="usr-cuerpo">
        <div className="usr-bandeja">
          {cargando ? (
            <ul className="usr-lista" aria-hidden="true">
              {[0, 1, 2, 3].map((indice) => <li key={indice} className="usr-tarjeta-esqueleto org-brilla" />)}
            </ul>
          ) : usuarios.length === 0 ? (
            <div className="usuarios-vacio">
              <IcUsers size={30} />
              <p className="usuarios-vacio-titulo">No hay personas registradas.</p>
              <p className="usuarios-vacio-sub">Crea la primera cuenta con el botón superior.</p>
            </div>
          ) : listaOrdenada.length === 0 ? (
            <div className="usuarios-vacio">
              <IcSearch size={26} />
              <p className="usuarios-vacio-titulo">Sin coincidencias</p>
              <p className="usuarios-vacio-sub">Ninguna cuenta coincide con la búsqueda o los filtros activos.</p>
              {hayFiltros && (
                <button type="button" className="adm-btn adm-btn--secundario" onClick={filtro.limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div
              role="listbox"
              aria-label="Directorio de personas"
              tabIndex={0}
              className="usr-listbox"
              onKeyDown={manejarTecladoLista}
            >
              {seccionesVisibles.map((seccion) => (
                <section key={seccion.rol} className="usr-seccion" aria-labelledby={`usr-grupo-${seccion.rol}`}>
                  <header className="usr-seccion-cabecera">
                    <div>
                      <h2 id={`usr-grupo-${seccion.rol}`}>
                        <span className={`usuarios-rol-dot usuarios-rol-dot--${seccion.tono}`} aria-hidden="true" />
                        {seccion.titulo}
                        <span className="usr-seccion-conteo">{seccion.cuentas.length}</span>
                      </h2>
                      <p>{seccion.subtitulo}</p>
                    </div>
                    {!esPropietario && (
                      <button
                        type="button"
                        className="usr-seccion-agregar"
                        onClick={() => void abrirCrearUsuario(seccion.rol)}
                      >
                        <IcPlus size={14} aria-hidden="true" />
                        <span>{seccion.botonCrear}</span>
                      </button>
                    )}
                  </header>

                  {seccion.cuentas.length === 0 ? (
                    <p className="usr-seccion-vacio">No hay cuentas en este grupo.</p>
                  ) : (
                    <ul className="usr-lista">
                      {seccion.cuentas.map((usuario) => {
                        const esSeleccionado = usuario.id === seleccionado?.id
                        const rolClase = usuario.rol.nombre.toLowerCase()
                        const secundario = [
                          `@${usuario.username}`,
                          usuario.organizacion?.nombre,
                          usuario.email || usuario.telefono,
                        ].filter(Boolean).join(' · ')

                        return (
                          <li
                            key={usuario.id}
                            className={`usr-item${esSeleccionado ? ' is-seleccionado' : ''}${usuario.activo ? '' : ' is-inactivo'}`}
                            role="option"
                            aria-selected={esSeleccionado}
                          >
                            <button
                              type="button"
                              className="usr-tarjeta"
                              onClick={() => seleccionar(usuario.id, true)}
                            >
                              <span className={`usuarios-avatar usuarios-avatar--${rolClase}`} aria-hidden="true">
                                {iniciales(usuario.nombre_completo)}
                              </span>

                              <span className="usr-tarjeta-info">
                                <span className="usr-tarjeta-linea">
                                  <strong className="usr-tarjeta-nombre">{usuario.nombre_completo}</strong>
                                  <span className={`usr-estado-punto${usuario.activo ? ' is-activo' : ''}`} title={usuario.activo ? 'Activo' : 'Inactivo'}>
                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                  </span>
                                </span>
                                <span className="usr-tarjeta-meta">{secundario}</span>
                              </span>

                              <span className="usr-tarjeta-lado">
                                <span className="usr-tarjeta-cedula">{usuario.cedula}</span>
                                <IcChevronRight size={16} className="usr-tarjeta-flecha" aria-hidden="true" />
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        {!cargando && usuarios.length > 0 && (
          <PanelUsuario
            usuario={seleccionado}
            esAdmin={esAdmin}
            abiertoMovil={panelMovilAbierto && seleccionado !== null}
            onCerrarMovil={() => setPanelMovilAbierto(false)}
            onAlternarActivo={(usuario) => void alternarActivo(usuario)}
            onEditar={(usuario) => void abrirEditarUsuario(usuario)}
            onGestionarAsignaciones={(usuario) => void asignaciones.abrir(usuario)}
            onRecuperarAcceso={esAdmin ? setUsuarioRecuperaciones : undefined}
            onEliminar={confirmarEliminacion}
          />
        )}
      </div>

      {formulario.abierto && (
        <FormularioUsuario
          form={formulario.form}
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          errores={formulario.errores}
          verPassword={formulario.verPassword}
          roles={rolesCatalogo}
          organizaciones={organizaciones}
          rolBloqueado={esPropietario}
          titulo={tituloFormulario}
          esPropietario={esPropietario}
          galpones={galpones}
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
          subtitulo={usuarioRecuperaciones.username}
          onCerrar={() => setUsuarioRecuperaciones(null)}
        >
          <RecuperacionesDeUsuario usuario={usuarioRecuperaciones} />
        </PantallaHija>
      )}
    </div>
  )
}

export default UsuariosPage
