import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { permisosDeGestion, ROL_ADMIN } from '@shared/auth/permisos'
import { IcAlert, IcEgg, IcGrid, IcLeaf, IcPin, IcPlus, IcRefresh } from '@shared/ui/icons/icons'
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
import MenuAcciones from './components/MenuAcciones'
import SelectorGranjas from './components/SelectorGranjas'
import { useEstructuraGranjas, type GalponConLotes } from './hooks/useEstructuraGranjas'
import { useFormularioGranja } from './hooks/useFormularioGranja'
import { useGranjas } from './hooks/useGranjas'
import { useIndicadoresDeLotes } from './hooks/useIndicadoresDeLotes'
import { usePropietariosGranja } from './hooks/usePropietariosGranja'
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
  // Lo desplegado se guarda por granja: volver a una ya visitada la
  // reencuentra como se dejó, en vez de reiniciarse.
  const [desplegadosPorGranja, setDesplegadosPorGranja] = useState<Map<number, Set<number>>>(
    new Map(),
  )

  const seleccionada = useMemo(
    () => estructura.find((item) => item.granja.id === granjaId) ?? estructura[0] ?? null,
    [estructura, granjaId],
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

  const stats: Stat[] = [
    { label: 'Granjas', valor: totales.granjas, icono: <IcLeaf size={18} />, tono: 'neutral' },
    { label: 'Galpones', valor: totales.galpones, icono: <IcGrid size={18} />, tono: 'neutral' },
    { label: 'Lotes activos', valor: totales.lotesActivos, icono: <IcEgg size={18} />, tono: 'ok' },
    { label: 'Aves alojadas', valor: totales.aves, icono: <IcEgg size={18} />, tono: 'info' },
  ]

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
              {esAdministrador ? 'Estructura productiva' : 'Mi operación'}
            </span>
            <h1>Mis granjas</h1>
            <p>Granjas, galpones y lotes en una sola vista.</p>
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
            {permisos.crear && (
              <button
                type="button"
                className="gr-btn gr-btn--primario"
                onClick={() => formularioGranja.abrirCrear()}
              >
                <IcPlus size={15} aria-hidden="true" />
                Nueva granja
              </button>
            )}
          </div>
        </div>
      </header>

      <TarjetasResumen stats={stats} etiqueta="Resumen general" />

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargarTodo()}>Reintentar</button>
        </div>
      )}

      {estructura.length === 0 ? (
        <div className="gr-vacio gr-vacio--grande">
          <span className="gr-vacio-icono" aria-hidden="true">
            <IcLeaf size={26} />
          </span>
          <h2>No tienes granjas registradas todavía.</h2>
          <p>
            La granja es el punto de partida: de ella cuelgan los galpones y, dentro de cada uno,
            sus lotes.
          </p>
          {permisos.crear && (
            <button
              type="button"
              className="gr-btn gr-btn--primario"
              onClick={() => formularioGranja.abrirCrear()}
            >
              Crear mi primera granja
            </button>
          )}
        </div>
      ) : (
        <>
          <SelectorGranjas
            estructura={estructura}
            granjaId={idSeleccionada}
            onSeleccionar={setGranjaId}
          />

          {seleccionada && (
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
                    {seleccionada.granja.propietario && (
                      <> · {seleccionada.granja.propietario.nombre_completo}</>
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
                  {permisos.crear && (
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
                      onCrearLote={(item) => {
                        const proveedor = proveedores[0]
                        if (proveedor) formularioLote.abrirCrear(item.id, proveedor.id)
                        else
                          window.alert(
                            'No hay proveedores activos. Un administrador debe registrar uno antes de crear lotes.',
                          )
                      }}
                      onEditarLote={formularioLote.abrirEditar}
                      onAlternarLote={(lote) => void alternarLote(lote)}
                      onEliminarLote={(lote) => void eliminarLote(lote)}
                    />
                  ))}
                </div>
              )}
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
