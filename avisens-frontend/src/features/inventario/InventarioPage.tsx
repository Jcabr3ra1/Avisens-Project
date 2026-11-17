import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api'
import { permisosDeInsumo, permisosDeProveedor, ROL_ADMIN } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import { IcAlert, IcBox, IcCoin, IcPlus, IcSearch } from '@shared/ui/icons/icons'
import BotonActualizar from '@shared/ui/BotonActualizar/BotonActualizar'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import { crearProveedor, listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'
import FormularioProveedor from '@features/proveedores/components/FormularioProveedor'
import { useFormularioProveedor } from '@features/proveedores/hooks/useFormularioProveedor'
import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from './api/insumos'
import AcordeonInsumo from './components/AcordeonInsumo'
import FormularioInsumo from './components/FormularioInsumo'
import FormularioMovimiento from './components/FormularioMovimiento'
import { AvisoInsumo, useFormularioInsumo } from './hooks/useFormularioInsumo'
import { useInventario } from './hooks/useInventario'
import { useMovimientosInsumo } from './hooks/useMovimientosInsumo'
import { buscarInsumoDuplicado } from './model/formularioInsumo'
import {
  filtrarInsumos,
  ordenarPorUrgencia,
  resumirInventario,
  textoBodegaVacia,
  type FiltroStock,
} from './model/inventario'
import './InventarioPage.css'

const FILTROS: { valor: FiltroStock; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'reposicion', etiqueta: 'Por reponer' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
]

function InventarioPage() {
  const rol = getRol()
  const esAdministrador = rol === ROL_ADMIN
  const permisos = permisosDeInsumo(rol)
  const permisosProveedor = permisosDeProveedor(rol)

  const gestion = useInventario()
  // El backend exige granja_id al crear un insumo; sin esto el alta
  // respondía 400 sin que la pantalla pudiera explicarlo.
  const [granjas, setGranjas] = useState<Granja[]>([])
  useEffect(() => {
    // Solo quien crea insumos necesita elegir granja; al operario esta
    // consulta le respondía 403.
    if (!permisos.crear) return
    let vigente = true
    void listarGranjas()
      .then((lista) => {
        if (vigente) setGranjas(lista.filter((granja) => granja.activa))
      })
      .catch(() => {
        if (vigente) setGranjas([])
      })
    return () => {
      vigente = false
    }
  }, [permisos.crear])

  // HU-58: el insumo se asocia a su proveedor. Solo quien crea insumos
  // necesita la lista; los inactivos no se ofrecen para compras nuevas.
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  useEffect(() => {
    if (!permisos.crear) return
    let vigente = true
    void listarProveedores()
      .then((lista) => {
        if (vigente) setProveedores(ordenarProveedores(lista.filter((proveedor) => proveedor.activo)))
      })
      .catch(() => {
        if (vigente) setProveedores([])
      })
    return () => {
      vigente = false
    }
  }, [permisos.crear])

  // HU-58 · escenario 2: si ya existe el mismo insumo con el mismo proveedor
  // en la granja, no se crea otro: se ofrece sumar la cantidad como una
  // entrada, que queda en su historial.
  const { insumos, guardar: guardarEnBodega, registrarMovimiento } = gestion
  const guardarInsumo = useCallback(
    async (datos: CrearInsumoPayload | ActualizarInsumoPayload, editandoId: number | null) => {
      if (editandoId === null) {
        const nuevo = datos as CrearInsumoPayload
        const duplicadoId = buscarInsumoDuplicado(insumos, {
          granja_id: nuevo.granja_id,
          nombre: nuevo.nombre,
          proveedor_habitual_id: nuevo.proveedor_habitual_id ?? 0,
        })
        const existente = insumos.find((insumo) => insumo.id === duplicadoId)
        if (existente) {
          const cantidad = nuevo.stock_actual ?? 0
          if (cantidad <= 0) {
            throw new AvisoInsumo(
              `«${existente.nombre}» ya existe con ese proveedor en esta granja. Para sumar stock, regístrale una entrada desde su tarjeta.`,
            )
          }
          const sumar = await confirmarAccion({
            titulo: 'Este insumo ya está en la bodega',
            entidad: existente.nombre,
            descripcion: `Tiene ${existente.stock_actual.toLocaleString('es-CO')} ${existente.unidad_medida} con el mismo proveedor. En lugar de duplicarlo, se sumarán ${cantidad.toLocaleString('es-CO')} ${existente.unidad_medida} como una entrada.`,
            textoConfirmar: 'Sumar al existente',
            tono: 'aviso',
          })
          if (!sumar) {
            throw new AvisoInsumo('No se guardó: ya existe un insumo con ese nombre y proveedor en esta granja.')
          }
          await registrarMovimiento(existente.id, {
            tipo_movimiento: 'entrada',
            cantidad,
            motivo: 'Ingreso sumado desde «Nuevo insumo»',
          })
          toast.success(`Se sumaron ${cantidad.toLocaleString('es-CO')} ${existente.unidad_medida} a ${existente.nombre}`)
          return
        }
      }
      await guardarEnBodega(datos, editandoId)
    },
    [insumos, guardarEnBodega, registrarMovimiento],
  )

  const formulario = useFormularioInsumo(
    guardarInsumo,
    granjas.length === 1 ? granjas[0].id : 0,
  )

  // HU-58 · escenario 3: el proveedor que falta se registra sin salir del
  // formulario y queda elegido en el insumo.
  const { cambiar: cambiarCampoInsumo } = formulario
  const altaProveedor = useFormularioProveedor(
    useCallback(async (datos) => {
      try {
        const creado = await crearProveedor({
          nombre: datos.nombre.trim(),
          nit: datos.nit.trim(),
          tipo_proveedor: datos.tipo_proveedor.trim() || undefined,
          contacto_persona: datos.contacto_persona.trim() || undefined,
          telefono: datos.telefono.trim() || undefined,
          email: datos.email.trim() || undefined,
          direccion: datos.direccion.trim() || undefined,
        })
        setProveedores((previos) => ordenarProveedores([...previos, creado]))
        cambiarCampoInsumo('proveedor_habitual_id', creado.id)
        toast.success(`Proveedor ${creado.nombre} registrado`)
      } catch (err) {
        throw new Error(mensajeDeError(err, 'No se pudo registrar el proveedor.'))
      }
    }, [cambiarCampoInsumo]),
  )

  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroStock>('todos')
  const [expandido, setExpandido] = useState<number | null>(null)
  const [movimientoDe, setMovimientoDe] = useState<Insumo | null>(null)

  const historial = useMovimientosInsumo(expandido)

  const resumen = useMemo(() => resumirInventario(gestion.insumos), [gestion.insumos])
  const visibles = useMemo(
    () => ordenarPorUrgencia(filtrarInsumos(gestion.insumos, busqueda, filtro)),
    [gestion.insumos, busqueda, filtro],
  )

  const stats: Stat[] = [
    { label: 'Insumos', valor: resumen.total, icono: <IcBox size={18} />, tono: 'neutral' },
    {
      label: 'Por reponer',
      valor: resumen.bajos + resumen.criticos,
      icono: <IcAlert size={18} />,
      tono: resumen.bajos + resumen.criticos > 0 ? 'aviso' : 'neutral',
    },
    {
      label: 'Agotados',
      valor: resumen.agotados,
      icono: <IcAlert size={18} />,
      tono: resumen.agotados > 0 ? 'peligro' : 'neutral',
    },
    // El operario maneja cantidades, no dinero (auditoría QA, HALL-01).
    ...(permisos.verCostos ? [{
      label: 'Valor en bodega',
      valor: resumen.valorTotalCop.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }),
      icono: <IcCoin size={18} />,
      tono: 'info' as const,
    }] : []),
  ]

  async function confirmarEliminacion(insumo: Insumo) {
    const confirmado = (await confirmarAccion({
      titulo: '¿Eliminar este insumo?',
      entidad: insumo.nombre,
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar insumo',
      tono: 'peligro',
    }))
    if (confirmado) await gestion.eliminar(insumo)
  }

  if (gestion.cargando && gestion.insumos.length === 0) {
    return (
      <div className="page-container inv-page adm-page">
        <div className="inv-esqueleto" aria-busy="true" aria-label="Cargando la bodega">
          <div className="inv-hueso inv-hueso--cabecera" />
          <div className="inv-hueso inv-hueso--resumen" />
          {[0, 1, 2, 3].map((indice) => (
            <div key={indice} className="inv-hueso inv-hueso--fila" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container inv-page adm-page">
      <CabeceraAdmin
        eyebrow={esAdministrador ? 'Control de bodega' : 'Bodega'}
        titulo="Insumos"
        subtitulo={permisos.verCostos
          ? 'Stock, movimientos y reposición. Cada insumo guarda su propio historial.'
          : 'Lo que hay en bodega. Anota cada salida que lleves a tu galpón.'}
        acciones={(
          <>
            <BotonActualizar
              cargando={gestion.cargando}
              onActualizar={gestion.recargar}
            />
            {permisos.crear && (
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                onClick={formulario.abrirCrear}
              >
                <IcPlus size={15} aria-hidden="true" />
                Nuevo insumo
              </button>
            )}
          </>
        )}
      />

      <TarjetasResumen stats={stats} etiqueta="Resumen de la bodega" />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {gestion.insumos.length === 0 ? (
        <div className="inv-vacio inv-vacio--grande">
          <span className="inv-vacio-icono" aria-hidden="true">
            <IcBox size={26} />
          </span>
          <h2>La bodega todavía no tiene insumos.</h2>
          <p>{textoBodegaVacia(permisos)}</p>
          {permisos.crear && (
            <button
              type="button"
              className="inv-btn inv-btn--primario"
              onClick={formulario.abrirCrear}
            >
              Registrar primer insumo
            </button>
          )}
        </div>
      ) : (
        <section className="inv-panel" aria-label="Catálogo de insumos">
          <div className="inv-herramientas">
            <div className="inv-buscador">
              <IcSearch size={15} aria-hidden="true" />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por nombre, tipo o ubicación"
                aria-label="Buscar insumos"
              />
            </div>

            <div className="inv-segmentos" role="group" aria-label="Filtrar insumos">
              {FILTROS.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  className="inv-segmento"
                  aria-pressed={filtro === opcion.valor}
                  onClick={() => setFiltro(opcion.valor)}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>

            <span className="inv-conteo">
              {visibles.length === gestion.insumos.length
                ? `${gestion.insumos.length}`
                : `${visibles.length} de ${gestion.insumos.length}`}
            </span>
          </div>

          {visibles.length === 0 ? (
            <p className="inv-vacio">Ningún insumo coincide con la búsqueda.</p>
          ) : (
            <div className="inv-lista">
              {visibles.map((insumo) => (
                <AcordeonInsumo
                  key={insumo.id}
                  insumo={insumo}
                  expandido={expandido === insumo.id}
                  onAlternarExpansion={() =>
                    setExpandido((previo) => (previo === insumo.id ? null : insumo.id))
                  }
                  movimientos={historial.porInsumo.get(insumo.id)}
                  cargandoMovimientos={historial.cargando}
                  permisos={permisos}
                  onEditar={formulario.abrirEditar}
                  onAlternar={(item) => void gestion.alternarActivo(item)}
                  onEliminar={(item) => void confirmarEliminacion(item)}
                  onRegistrarMovimiento={setMovimientoDe}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {formulario.abierto && (
        <FormularioInsumo
          form={formulario.form}
          granjas={granjas}
          proveedores={proveedores}
          onNuevoProveedor={permisosProveedor.crear ? altaProveedor.abrirCrear : undefined}
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          onCambiar={formulario.cambiar}
          onGuardar={formulario.guardar}
          onCerrar={formulario.cerrar}
        />
      )}

      {altaProveedor.abierto && (
        <FormularioProveedor
          form={altaProveedor.form}
          modoEdicion={false}
          guardando={altaProveedor.guardando}
          error={altaProveedor.error}
          onCambiar={altaProveedor.cambiar}
          onGuardar={(evento) => void altaProveedor.guardar(evento)}
          onCerrar={altaProveedor.cerrar}
        />
      )}

      {movimientoDe && (
        <FormularioMovimiento
          insumo={movimientoDe}
          tiposPermitidos={permisos.tiposMovimiento}
          onCerrar={() => setMovimientoDe(null)}
          onRegistrar={async (payload) => {
            await gestion.registrarMovimiento(movimientoDe.id, payload)
            // El historial del insumo acaba de cambiar: se vuelve a pedir
            // solo si está abierto, para que el usuario lo vea reflejado.
            if (expandido === movimientoDe.id) await historial.refrescar(movimientoDe.id)
          }}
        />
      )}
    </div>
  )
}

function ordenarProveedores(lista: Proveedor[]): Proveedor[] {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO'))
}

export default InventarioPage
