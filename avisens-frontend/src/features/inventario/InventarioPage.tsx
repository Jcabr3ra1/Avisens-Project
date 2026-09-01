import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { permisosDeInsumo, ROL_ADMIN } from '@shared/auth/permisos'
import { IcAlert, IcBox, IcCoin, IcPlus, IcRefresh, IcSearch } from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import type { Insumo } from './api/insumos'
import AcordeonInsumo from './components/AcordeonInsumo'
import FormularioInsumo from './components/FormularioInsumo'
import FormularioMovimiento from './components/FormularioMovimiento'
import { useFormularioInsumo } from './hooks/useFormularioInsumo'
import { useInventario } from './hooks/useInventario'
import { useMovimientosInsumo } from './hooks/useMovimientosInsumo'
import {
  filtrarInsumos,
  ordenarPorUrgencia,
  resumirInventario,
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

  const gestion = useInventario()
  const formulario = useFormularioInsumo(gestion.guardar)

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
    {
      label: 'Valor en bodega',
      valor: resumen.valorTotalCop.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }),
      icono: <IcCoin size={18} />,
      tono: 'info',
    },
  ]

  async function confirmarEliminacion(insumo: Insumo) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente el insumo "${insumo.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (confirmado) await gestion.eliminar(insumo)
  }

  if (gestion.cargando && gestion.insumos.length === 0) {
    return (
      <div className="page-container inv-page">
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
    <div className="page-container inv-page">
      <header className="inv-cabecera">
        <div className="inv-cabecera-fila">
          <div>
            <span className="inv-eyebrow">
              <span className="inv-eyebrow-punto" aria-hidden="true" />
              {esAdministrador ? 'Control de bodega' : 'Bodega'}
            </span>
            <h1>Insumos</h1>
            <p>Stock, movimientos y reposición. Cada insumo guarda su propio historial.</p>
          </div>
          <div className="inv-cabecera-acciones">
            <button
              type="button"
              className="inv-btn inv-btn--suave"
              onClick={() => void gestion.recargar()}
            >
              <IcRefresh size={14} aria-hidden="true" />
              Actualizar
            </button>
            {permisos.crear && (
              <button
                type="button"
                className="inv-btn inv-btn--primario"
                onClick={formulario.abrirCrear}
              >
                <IcPlus size={15} aria-hidden="true" />
                Nuevo insumo
              </button>
            )}
          </div>
        </div>
      </header>

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
          <p>
            Registra el primero para llevar su stock y dejar rastro de cada entrada y salida.
          </p>
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
          <div className="inv-barra">
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
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          onCambiar={formulario.cambiar}
          onGuardar={formulario.guardar}
          onCerrar={formulario.cerrar}
        />
      )}

      {movimientoDe && (
        <FormularioMovimiento
          insumo={movimientoDe}
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

export default InventarioPage
