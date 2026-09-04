import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { permisosDeGestion, ROL_ADMIN } from '@shared/auth/permisos'
import {
  IcAlert,
  IcEgg,
  IcGrid,
  IcLeaf,
  IcPin,
  IcPlus,
  IcRefresh,
  IcSearch,
} from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import {
  activarGalpon,
  actualizarGalpon,
  crearGalpon,
  desactivarGalpon,
  eliminarGalponPermanente,
} from '@features/galpones/api/galpones'
import FormularioGalpon from '@features/galpones/components/FormularioGalpon'
import { useFormularioGalpon } from '@features/galpones/hooks/useFormularioGalpon'
import {
  activarLote,
  actualizarLote,
  crearLote,
  desactivarLote,
  eliminarLotePermanente,
  type CrearLotePayload,
  type Lote,
} from '@features/lotes/api/lotes'
import FormularioLote from '@features/lotes/components/FormularioLote'
import { useFormularioLote } from '@features/lotes/hooks/useFormularioLote'
import type { Granja } from './api/granjas'
import AcordeonGalpon from './components/AcordeonGalpon'
import Badge from './components/Badge'
import EsqueletoGranjas from './components/EsqueletoGranjas'
import FormularioGranja from './components/FormularioGranja'
import MenuAcciones from '@shared/ui/MenuAcciones/MenuAcciones'
import SelectorGranjas from './components/SelectorGranjas'
import TableroImplementacionGranjas from './components/TableroImplementacionGranjas'
import TablaControlGranjas from './components/TablaControlGranjas'
import { useEstructuraGranjas, type GalponConLotes } from './hooks/useEstructuraGranjas'
import { useFormularioGranja } from './hooks/useFormularioGranja'
import { useGranjas } from './hooks/useGranjas'
import { useIndicadoresDeLotes } from './hooks/useIndicadoresDeLotes'
import { usePropietariosGranja } from './hooks/usePropietariosGranja'
import { calcularEtapasImplementacionGranjas } from './model/implementacion'
import './GranjasPage.css'

function GranjasPage() {
  const rol = getRol()
  const esAdministrador = rol === ROL_ADMIN
  const permisos = permisosDeGestion(rol)

  const { estructura, proveedores, consumoPorLote, cargando, error, recargar } =
    useEstructuraGranjas()
  const gestionGranjas = useGranjas()
  const catalogoPropietarios = usePropietariosGranja(esAdministrador)

  // Granja elegida y galpones desplegados: el único estado de la página.
  // Aquí navegar es revelar, no cambiar de ruta.
  const [granjaId, setGranjaId] = useState<number | null>(null)
  const [vistaAdministrativa, setVistaAdministrativa] = useState<'proceso' | 'tabla'>('proceso')
  const [busquedaAdministrativa, setBusquedaAdministrativa] = useState('')
  // Lo desplegado se guarda por granja: volver a una ya visitada la
  // reencuentra como se dejó, en vez de reiniciarse.
  const [desplegadosPorGranja, setDesplegadosPorGranja] = useState<Map<number, Set<number>>>(
    new Map(),
  )

  const seleccionada = useMemo(
    () => {
      if (esAdministrador) {
        return granjaId === null
          ? null
          : estructura.find((item) => item.granja.id === granjaId) ?? null
      }

      return estructura.find((item) => item.granja.id === granjaId) ?? estructura[0] ?? null
    },
    [esAdministrador, estructura, granjaId],
  )
  const idSeleccionada = seleccionada?.granja.id ?? null

  // Sin decisión previa del usuario, se abren los galpones con lote en
  // curso: es lo que viene a mirar. Los vacíos quedan plegados.
  const desplegados = useMemo(() => {
    if (seleccionada === null) return new Set<number>()
    const guardado = desplegadosPorGranja.get(seleccionada.granja.id)
    if (guardado) return guardado
    return new Set(
      seleccionada.galpones
        .filter((galpon) => galpon.loteEnCurso !== null)
        .map((galpon) => galpon.id),
    )
  }, [seleccionada, desplegadosPorGranja])

  function alternarDespliegue(galponId: number) {
    if (idSeleccionada === null) return
    const siguiente = new Set(desplegados)
    if (siguiente.has(galponId)) siguiente.delete(galponId)
    else siguiente.add(galponId)
    setDesplegadosPorGranja((previo) => new Map(previo).set(idSeleccionada, siguiente))
  }

  // Solo se piden indicadores de los lotes activos que están a la vista.
  const lotesVisibles = useMemo(() => {
    if (seleccionada === null) return []
    return seleccionada.galpones
      .filter((galpon) => desplegados.has(galpon.id))
      .flatMap((galpon) => galpon.lotes.filter((lote) => lote.estado === 'activo'))
      .map((lote) => lote.id)
  }, [seleccionada, desplegados])
  const { porLote } = useIndicadoresDeLotes(lotesVisibles)

  async function recargarTodo() {
    await Promise.all([recargar(), gestionGranjas.recargar()])
  }

  const formularioGranja = useFormularioGranja(async (datos, editandoId) => {
    await gestionGranjas.guardar(datos, editandoId)
    await recargarTodo()
  })

  const formularioGalpon = useFormularioGalpon(async (datos, editandoId) => {
    if (editandoId === null) await crearGalpon(datos)
    else await actualizarGalpon(editandoId, datos)
    await recargarTodo()
  })

  const formularioLote = useFormularioLote(async (datos, editandoId) => {
    if (editandoId === null) await crearLote(datos as CrearLotePayload)
    else await actualizarLote(editandoId, datos)
    await recargarTodo()
  })

  async function alternarGalpon(galpon: GalponConLotes) {
    if (galpon.activo) await desactivarGalpon(galpon.id)
    else await activarGalpon(galpon.id)
    await recargarTodo()
  }

  async function eliminarGalpon(galpon: GalponConLotes) {
    if (!window.confirm(`¿Eliminar permanentemente el galpón "${galpon.nombre}"?`)) return
    await eliminarGalponPermanente(galpon.id)
    await recargarTodo()
  }

  async function alternarLote(lote: Lote) {
    if (lote.estado === 'activo') await desactivarLote(lote.id)
    else await activarLote(lote.id)
    await recargarTodo()
  }

  async function eliminarLote(lote: Lote) {
    if (!window.confirm(`¿Eliminar permanentemente el lote "${lote.codigo}"?`)) return
    await eliminarLotePermanente(lote.id)
    await recargarTodo()
  }

  function eliminarGranja(granja: Granja) {
    if (!window.confirm(`¿Eliminar permanentemente la granja "${granja.nombre}"?`)) return
    void gestionGranjas.eliminar(granja).then(recargarTodo)
  }

  const totales = useMemo(
    () => ({
      granjas: estructura.length,
      galpones: estructura.reduce((total, item) => total + item.galpones.length, 0),
      lotesActivos: estructura.reduce((total, item) => total + item.lotesActivos, 0),
      aves: estructura.reduce((total, item) => total + item.avesAlojadas, 0),
    }),
    [estructura],
  )

  const etapas = useMemo(
    () =>
      calcularEtapasImplementacionGranjas(
        catalogoPropietarios.propietarios,
        estructura.map((item) => item.granja),
        estructura.flatMap((item) => item.galpones),
      ),
    [catalogoPropietarios.propietarios, estructura],
  )

  const estructuraFiltrada = useMemo(() => {
    const termino = busquedaAdministrativa.trim().toLocaleLowerCase('es-CO')
    if (!termino) return estructura
    return estructura.filter((item) =>
      [
        item.granja.nombre,
        item.granja.propietario.nombre_completo,
        item.granja.municipio,
        item.granja.departamento,
      ].some((valor) => valor?.toLocaleLowerCase('es-CO').includes(termino)),
    )
  }, [busquedaAdministrativa, estructura])

  const stats: Stat[] = [
    { label: 'Granjas', valor: totales.granjas, icono: <IcLeaf size={18} />, tono: 'neutral' },
    { label: 'Galpones', valor: totales.galpones, icono: <IcGrid size={18} />, tono: 'neutral' },
    { label: 'Lotes activos', valor: totales.lotesActivos, icono: <IcEgg size={18} />, tono: 'ok' },
    { label: 'Aves alojadas', valor: totales.aves, icono: <IcEgg size={18} />, tono: 'info' },
  ]

  const contenidoPorRol = esAdministrador
    ? {
        contexto: 'Control de organización',
        titulo: 'Granjas de la organización',
        descripcion: 'Administra la estructura productiva y asígnala a cada propietario.',
        resumen: 'Resumen de la organización',
        vacioTitulo: 'Aún no hay granjas registradas.',
        vacioDescripcion:
          'Crea la primera granja y asígnala a un propietario para iniciar su estructura productiva.',
        accionVacia: 'Crear primera granja',
      }
    : {
        contexto: 'Mi operación',
        titulo: 'Mis granjas',
        descripcion: 'Consulta la estructura productiva de las granjas que tienes asignadas.',
        resumen: 'Resumen de mis granjas',
        vacioTitulo: 'Aún no tienes granjas asignadas.',
        vacioDescripcion:
          'Cuando el administrador te asigne una granja, podrás consultar aquí sus galpones y lotes.',
        accionVacia: 'Crear mi primera granja',
      }

  if (cargando && estructura.length === 0) {
    return (
      <div className="page-container gr-page">
        <EsqueletoGranjas />
      </div>
    )
  }

  return (
    <div className="page-container gr-page">
      <header className="gr-cabecera">
        <div className="gr-cabecera-fila">
          <div>
            <span className="gr-eyebrow">
              <span className="gr-eyebrow-punto" aria-hidden="true" />
              {contenidoPorRol.contexto}
            </span>
            <h1>{contenidoPorRol.titulo}</h1>
            <p>{contenidoPorRol.descripcion}</p>
          </div>
          <div className="gr-cabecera-acciones">
            <button
              type="button"
              className="gr-btn gr-btn--suave"
              onClick={() => void recargarTodo()}
            >
              <IcRefresh size={14} aria-hidden="true" />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {esAdministrador ? (
        <section className="grj-resumen" aria-label={contenidoPorRol.resumen}>
          <TarjetasResumen stats={stats} etiqueta={contenidoPorRol.resumen} />
        </section>
      ) : (
        <TarjetasResumen stats={stats} etiqueta={contenidoPorRol.resumen} />
      )}

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargarTodo()}>Reintentar</button>
        </div>
      )}

      {estructura.length === 0 && !esAdministrador ? (
        <div className="gr-vacio gr-vacio--grande">
          <span className="gr-vacio-icono" aria-hidden="true">
            <IcLeaf size={26} />
          </span>
          <h2>{contenidoPorRol.vacioTitulo}</h2>
          <p>{contenidoPorRol.vacioDescripcion}</p>
          {permisos.crear && (
            <button
              type="button"
              className="gr-btn gr-btn--primario"
              onClick={() => formularioGranja.abrirCrear()}
            >
              {contenidoPorRol.accionVacia}
            </button>
          )}
        </div>
      ) : (
        <>
          {esAdministrador && (
            <section className="grj-gestion" aria-label="Gestión administrativa de granjas">
              <div className="grj-vistas">
                <div className="grj-vistas-cabecera">
                  <div>
                    <p className="grj-tablero-kicker">Granjas de la organización</p>
                    <h2>{vistaAdministrativa === 'proceso' ? 'Flujo de implementación' : 'Todas las granjas'}</h2>
                    <p>
                      {vistaAdministrativa === 'proceso'
                        ? 'Prioriza el paso que falta para poner cada granja en operación.'
                        : 'Busca, compara e inspecciona la estructura de cada granja.'}
                    </p>
                  </div>
                  <div className="grj-selector-vista" aria-label="Vista de granjas">
                    <button
                      type="button"
                      aria-pressed={vistaAdministrativa === 'proceso'}
                      className={vistaAdministrativa === 'proceso' ? 'is-activa' : undefined}
                      onClick={() => setVistaAdministrativa('proceso')}
                    >
                      Proceso
                    </button>
                    <button
                      type="button"
                      aria-pressed={vistaAdministrativa === 'tabla'}
                      className={vistaAdministrativa === 'tabla' ? 'is-activa' : undefined}
                      onClick={() => setVistaAdministrativa('tabla')}
                    >
                      Todas las granjas
                    </button>
                  </div>
                </div>

                {vistaAdministrativa === 'proceso' ? (
                  <TableroImplementacionGranjas
                    etapas={etapas}
                    cargando={cargando || catalogoPropietarios.cargando}
                    onAsignarGranja={(propietarioId) => formularioGranja.abrirCrear(propietarioId)}
                    onAbrirGranja={setGranjaId}
                  />
                ) : (
                  <div className="grj-tabla-contenedor">
                    <label className="grj-busqueda">
                      <span>Buscar granja, propietario o municipio</span>
                      <div>
                        <IcSearch size={16} aria-hidden="true" />
                        <input
                          type="search"
                          value={busquedaAdministrativa}
                          onChange={(evento) => setBusquedaAdministrativa(evento.target.value)}
                          placeholder="Ej. La Esperanza o Ana Pérez"
                        />
                      </div>
                    </label>
                    <TablaControlGranjas
                      estructura={estructuraFiltrada}
                      granjaSeleccionadaId={idSeleccionada}
                      onSeleccionar={setGranjaId}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {!esAdministrador && (
            <SelectorGranjas
              estructura={estructura}
              granjaId={idSeleccionada}
              onSeleccionar={setGranjaId}
            />
          )}

          {seleccionada && (
            <section className="gr-inspeccion">
              {esAdministrador && (
                <header className="gr-inspeccion-cabecera">
                  <div>
                    <span className="gr-eyebrow">
                      <span className="gr-eyebrow-punto" aria-hidden="true" />
                      Inspección administrativa
                    </span>
                    <h2>Detalle de la granja asignada</h2>
                    <p>Revisa su estructura y gestiona los ajustes necesarios.</p>
                  </div>
                  <button
                    type="button"
                    className="gr-btn gr-btn--suave"
                    onClick={() => setGranjaId(null)}
                  >
                    Cerrar inspección
                  </button>
                </header>
              )}

            <section className="gr-granja" aria-labelledby="gr-granja-titulo">
              <header className="gr-granja-cabecera">
                <div>
                  <div className="gr-granja-titulo">
                    <h2 id="gr-granja-titulo">{seleccionada.granja.nombre}</h2>
                    <Badge
                      tono={seleccionada.granja.activa ? 'activo' : 'neutral'}
                      texto={seleccionada.granja.activa ? 'Activa' : 'Inactiva'}
                    />
                  </div>
                  <p className="gr-granja-lugar">
                    <IcPin size={13} aria-hidden="true" />
                    {seleccionada.granja.municipio ?? '—'},{' '}
                    {seleccionada.granja.departamento ?? '—'}
                    {esAdministrador && seleccionada.granja.propietario && (
                      <> · Propietario: {seleccionada.granja.propietario.nombre_completo}</>
                    )}
                  </p>
                  <p className="gr-granja-cifras">
                    <strong>{seleccionada.galpones.length}</strong> galpones ·{' '}
                    <strong>{seleccionada.lotesActivos}</strong> lotes activos ·{' '}
                    <strong>{seleccionada.avesAlojadas.toLocaleString()}</strong> aves
                    {seleccionada.alertasAbiertas > 0 && (
                      <span className="gr-granja-alertas">
                        <IcAlert size={13} aria-hidden="true" />
                        {seleccionada.alertasAbiertas} alertas
                      </span>
                    )}
                  </p>
                </div>

                <div className="gr-granja-acciones">
                  {permisos.crear && seleccionada.galpones.length > 0 && (
                    <button
                      type="button"
                      className="gr-btn gr-btn--suave"
                      onClick={() => formularioGalpon.abrirCrear(seleccionada.granja.id)}
                    >
                      <IcPlus size={14} aria-hidden="true" />
                      Añadir galpón
                    </button>
                  )}
                  <MenuAcciones
                    etiqueta={`Acciones de ${seleccionada.granja.nombre}`}
                    acciones={[
                      ...(permisos.editar
                        ? [
                            {
                              etiqueta: 'Editar granja',
                              onSeleccionar: () =>
                                formularioGranja.abrirEditar(seleccionada.granja),
                            },
                          ]
                        : []),
                      ...(permisos.alternarActivo
                        ? [
                            {
                              etiqueta: seleccionada.granja.activa ? 'Desactivar' : 'Activar',
                              onSeleccionar: () =>
                                void gestionGranjas
                                  .alternarActivo(seleccionada.granja)
                                  .then(recargarTodo),
                            },
                          ]
                        : []),
                      ...(permisos.eliminar
                        ? [
                            {
                              etiqueta: 'Eliminar granja',
                              onSeleccionar: () => eliminarGranja(seleccionada.granja),
                              peligrosa: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </header>

              {seleccionada.galpones.length === 0 ? (
                <div className="gr-vacio">
                  <p>Esta granja todavía no tiene galpones.</p>
                  {permisos.crear && (
                    <button
                      type="button"
                      className="gr-btn gr-btn--suave"
                      onClick={() => formularioGalpon.abrirCrear(seleccionada.granja.id)}
                    >
                      Añadir primer galpón
                    </button>
                  )}
                </div>
              ) : (
                <div className="gr-galpones">
                  {seleccionada.galpones.map((galpon) => (
                    <AcordeonGalpon
                      key={galpon.id}
                      galpon={galpon}
                      expandido={desplegados.has(galpon.id)}
                      onAlternarExpansion={() => alternarDespliegue(galpon.id)}
                      indicadoresPorLote={porLote}
                      consumoPorLote={consumoPorLote}
                      permisos={permisos}
                      onEditarGalpon={(item) => formularioGalpon.abrirEditar(item.origen)}
                      onAlternarGalpon={(item) => void alternarGalpon(item)}
                      onEliminarGalpon={(item) => void eliminarGalpon(item)}
                      onCrearLote={(item) => formularioLote.abrirCrear(item.id)}
                      onEditarLote={formularioLote.abrirEditar}
                      onAlternarLote={(lote) => void alternarLote(lote)}
                      onEliminarLote={(lote) => void eliminarLote(lote)}
                    />
                  ))}
                </div>
              )}
            </section>
            </section>
          )}
        </>
      )}

      {formularioGranja.abierto && (
        <FormularioGranja
          form={formularioGranja.form}
          modoEdicion={formularioGranja.modoEdicion}
          esAdministrador={esAdministrador}
          propietarios={catalogoPropietarios.propietarios}
          cargandoPropietarios={catalogoPropietarios.cargando}
          errorPropietarios={catalogoPropietarios.error}
          guardando={formularioGranja.guardando}
          error={formularioGranja.error}
          onCambiar={formularioGranja.cambiar}
          onGuardar={formularioGranja.guardar}
          onCerrar={formularioGranja.cerrar}
        />
      )}

      {formularioGalpon.abierto && seleccionada && (
        <FormularioGalpon
          form={formularioGalpon.form}
          modoEdicion={formularioGalpon.modoEdicion}
          granjas={[seleccionada.granja]}
          guardando={formularioGalpon.guardando}
          error={formularioGalpon.error}
          onCambiar={formularioGalpon.cambiar}
          onGuardar={formularioGalpon.guardar}
          onCerrar={formularioGalpon.cerrar}
        />
      )}

      {formularioLote.abierto && seleccionada && (
        <FormularioLote
          form={formularioLote.form}
          modoEdicion={formularioLote.modoEdicion}
          galpones={seleccionada.galpones.map((galpon) => galpon.origen)}
          proveedores={proveedores}
          guardando={formularioLote.guardando}
          error={formularioLote.error}
          onCambiar={formularioLote.cambiar}
          onGuardar={formularioLote.guardar}
          onCerrar={formularioLote.cerrar}
        />
      )}
    </div>
  )
}

export default GranjasPage
