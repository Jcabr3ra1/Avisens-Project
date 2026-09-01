import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  IcAlert,
  IcChevronRight,
  IcEgg,
  IcGrid,
  IcLeaf,
  IcPin,
  IcRefresh,
} from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import { useGranjaDetalle } from './hooks/useGranjaDetalle'
import { useDetalleLote } from './hooks/useDetalleLote'
import PanelGalpon from './components/PanelGalpon'
import PanelLote from './components/PanelLote'
import TarjetaGalpon from './components/TarjetaGalpon'
import TarjetaLote from './components/TarjetaLote'
import './GranjaDetalle.css'

function GranjaDetallePage() {
  const { granjaId: granjaIdParam } = useParams()
  const granjaId = Number(granjaIdParam)
  const { granja, galpones, resumen, cargando, error, recargar } = useGranjaDetalle(granjaId)

  // Los dos únicos estados de la página. Galpón y lote son contexto de la
  // granja, no rutas: seleccionarlos no cambia la URL ni recarga nada.
  const [galponId, setGalponId] = useState<number | null>(null)
  const [loteId, setLoteId] = useState<number | null>(null)

  const galpon = useMemo(
    () => galpones.find((item) => item.id === galponId) ?? null,
    [galpones, galponId],
  )

  // Al cambiar de galpón, el lote elegido ya no pertenece a lo que se está
  // mirando: se abre directamente en su lote activo, que es lo que el
  // usuario quiere ver el 90 % de las veces.
  useEffect(() => {
    if (galpon === null) {
      setLoteId(null)
      return
    }
    const activo = galpon.lotes.find((lote) => lote.estado === 'activo')
    setLoteId(activo?.id ?? galpon.lotes[0]?.id ?? null)
  }, [galpon])

  const lote = useMemo(
    () => galpon?.lotes.find((item) => item.id === loteId) ?? null,
    [galpon, loteId],
  )
  const detalleLote = useDetalleLote(lote?.id ?? null)

  const stats: Stat[] = [
    { label: 'Galpones', valor: resumen.galpones, icono: <IcGrid size={18} />, tono: 'neutral' },
    { label: 'Activos', valor: resumen.galponesActivos, icono: <IcLeaf size={18} />, tono: 'ok' },
    { label: 'Aves alojadas', valor: resumen.avesAlojadas, icono: <IcEgg size={18} />, tono: 'info' },
    {
      label: 'Capacidad',
      valor: resumen.capacidadInstalada,
      icono: <IcGrid size={18} />,
      tono: 'neutral',
    },
    { label: 'Lotes activos', valor: resumen.lotesActivos, icono: <IcEgg size={18} />, tono: 'ok' },
    {
      label: 'Alertas',
      valor: resumen.alertasAbiertas,
      icono: <IcAlert size={18} />,
      tono: resumen.alertasAbiertas > 0 ? 'peligro' : 'neutral',
    },
  ]

  if (cargando && galpones.length === 0) {
    return (
      <div className="page-container gd-page">
        <p className="gd-cargando">Cargando la granja…</p>
      </div>
    )
  }

  if (error && granja === null) {
    return (
      <div className="page-container gd-page">
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container gd-page">
      {/* ── Nivel 1 · Granja ─────────────────────────────────────── */}
      <header className="gd-cabecera">
        <div className="gd-cabecera-fila">
          <div>
            <nav className="gd-migas" aria-label="Ubicación dentro de la granja">
              <Link to="/granjas">Granjas</Link>
              <IcChevronRight size={13} aria-hidden="true" />
              <span className={galpon ? '' : 'is-actual'}>{granja?.nombre ?? 'Granja'}</span>
              {galpon && (
                <>
                  <IcChevronRight size={13} aria-hidden="true" />
                  <span className={lote ? '' : 'is-actual'}>{galpon.nombre}</span>
                </>
              )}
              {galpon && lote && (
                <>
                  <IcChevronRight size={13} aria-hidden="true" />
                  <span className="is-actual">{lote.codigo}</span>
                </>
              )}
            </nav>

            <h1 className="gd-titulo">{granja?.nombre ?? 'Granja'}</h1>
            <p className="gd-subtitulo">
              <IcPin size={14} aria-hidden="true" />
              {granja?.municipio ?? '—'}, {granja?.departamento ?? '—'}
              {granja?.area_total_m2 !== null && granja?.area_total_m2 !== undefined && (
                <> · {granja.area_total_m2.toLocaleString()} m²</>
              )}
              {granja?.propietario && <> · {granja.propietario.nombre_completo}</>}
            </p>
          </div>

          <button type="button" className="gd-recargar" onClick={() => void recargar()}>
            <IcRefresh size={14} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </header>

      <TarjetasResumen stats={stats} etiqueta="Resumen de la granja" />

      {/* ── Nivel 2 · Galpones ───────────────────────────────────── */}
      <section className="gd-seccion" aria-labelledby="gd-galpones-titulo">
        <div className="gd-seccion-cabecera">
          <h2 id="gd-galpones-titulo">Galpones</h2>
          <span className="gd-seccion-nota">
            {galpon ? 'Selecciona otro para cambiar el detalle' : 'Selecciona uno para ver su detalle'}
          </span>
        </div>

        {galpones.length === 0 ? (
          <p className="gd-vacio">Esta granja todavía no tiene galpones registrados.</p>
        ) : (
          <div className="gd-galpones" role="radiogroup" aria-label="Galpones de la granja">
            {galpones.map((item) => (
              <TarjetaGalpon
                key={item.id}
                galpon={item}
                seleccionado={item.id === galponId}
                onSeleccionar={() => setGalponId(item.id === galponId ? null : item.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Nivel 3 · Detalle del galpón + sus lotes ─────────────── */}
      {galpon && (
        <section className="gd-detalle" aria-labelledby="gd-galpon-titulo">
          <div className="gd-detalle-cabecera">
            <div>
              <span className="gd-detalle-kicker">Galpón seleccionado</span>
              <h2 id="gd-galpon-titulo">{galpon.nombre}</h2>
            </div>
            <button
              type="button"
              className="gd-cerrar"
              onClick={() => setGalponId(null)}
              aria-label="Quitar la selección del galpón"
            >
              Cerrar
            </button>
          </div>

          <PanelGalpon galpon={galpon} />

          <div className="gd-seccion-cabecera gd-seccion-cabecera--interna">
            <h3>Lotes de {galpon.nombre}</h3>
            <span className="gd-seccion-nota">
              {galpon.lotes.length} {galpon.lotes.length === 1 ? 'registrado' : 'registrados'}
            </span>
          </div>

          {galpon.lotes.length === 0 ? (
            <p className="gd-vacio">Este galpón todavía no ha alojado ningún lote.</p>
          ) : (
            <div className="gd-lotes" role="radiogroup" aria-label={`Lotes de ${galpon.nombre}`}>
              {galpon.lotes.map((item) => (
                <TarjetaLote
                  key={item.id}
                  lote={item}
                  seleccionado={item.id === loteId}
                  onSeleccionar={() => setLoteId(item.id)}
                />
              ))}
            </div>
          )}

          {/* ── Nivel 4 · Detalle del lote ───────────────────────── */}
          {lote && (
            <div className="gd-detalle-lote">
              <div className="gd-detalle-cabecera gd-detalle-cabecera--lote">
                <div>
                  <span className="gd-detalle-kicker">Lote seleccionado</span>
                  <h3>{lote.codigo}</h3>
                </div>
              </div>
              <PanelLote lote={lote} detalle={detalleLote} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default GranjaDetallePage
