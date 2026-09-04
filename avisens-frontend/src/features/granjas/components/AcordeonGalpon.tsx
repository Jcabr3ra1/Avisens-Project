import type { Lote } from '@features/lotes/api/lotes'
import type { PermisosGestion } from '@shared/auth/permisos'
import { IcAlert, IcChevronDown, IcDrop, IcPlus, IcThermo } from '@shared/ui/icons/icons'
import {
  ETIQUETA_ESTADO,
  lecturaPorTipo,
  porcentajeOcupacion,
  type EstadoOperativo,
} from '../model/estructura'
import type { GalponConLotes } from '../hooks/useEstructuraGranjas'
import type { IndicadoresDeLote } from '../hooks/useIndicadoresDeLotes'
import FilaLote from './FilaLote'
import MenuAcciones from '@shared/ui/MenuAcciones/MenuAcciones'

interface Props {
  galpon: GalponConLotes
  expandido: boolean
  onAlternarExpansion: () => void
  indicadoresPorLote: Map<number, IndicadoresDeLote>
  consumoPorLote: Map<number, { alimentoKg: number; aguaLitros: number }>
  permisos: PermisosGestion
  onEditarGalpon: (galpon: GalponConLotes) => void
  onAlternarGalpon: (galpon: GalponConLotes) => void
  onEliminarGalpon: (galpon: GalponConLotes) => void
  onCrearLote: (galpon: GalponConLotes) => void
  onEditarLote: (lote: Lote) => void
  onAlternarLote: (lote: Lote) => void
  onEliminarLote: (lote: Lote) => void
}

const TONO_ESTADO: Record<EstadoOperativo, string> = {
  normal: 'activo',
  atencion: 'preparacion',
  alerta: 'alerta',
  inactivo: 'neutral',
  sin_datos: 'neutral',
}

function formatear(valor: number | null, unidad: string): string | null {
  if (valor === null) return null
  return `${valor.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unidad}`
}

function AcordeonGalpon({
  galpon,
  expandido,
  onAlternarExpansion,
  indicadoresPorLote,
  consumoPorLote,
  permisos,
  onEditarGalpon,
  onAlternarGalpon,
  onEliminarGalpon,
  onCrearLote,
  onEditarLote,
  onAlternarLote,
  onEliminarLote,
}: Props) {
  const temperatura = lecturaPorTipo(galpon.sensores, 'temp')
  const humedad = lecturaPorTipo(galpon.sensores, 'hum')
  const aves = galpon.loteEnCurso?.cantidad_inicial ?? 0
  const ocupacion = porcentajeOcupacion(aves, galpon.capacidadAves)
  const panelId = `gr-panel-galpon-${galpon.id}`

  const acciones = [
    ...(permisos.editar
      ? [{ etiqueta: 'Editar galpón', onSeleccionar: () => onEditarGalpon(galpon) }]
      : []),
    ...(permisos.alternarActivo
      ? [
          {
            etiqueta: galpon.activo ? 'Desactivar galpón' : 'Activar galpón',
            onSeleccionar: () => onAlternarGalpon(galpon),
          },
        ]
      : []),
    ...(permisos.eliminar
      ? [
          {
            etiqueta: 'Eliminar galpón',
            onSeleccionar: () => onEliminarGalpon(galpon),
            peligrosa: true,
          },
        ]
      : []),
  ]

  return (
    <section className={`gr-galpon gr-galpon--${galpon.estadoOperativo}`}>
      <div className="gr-galpon-barra">
        <button
          type="button"
          className="gr-galpon-disparador"
          aria-expanded={expandido}
          aria-controls={panelId}
          onClick={onAlternarExpansion}
        >
          <IcChevronDown
            size={16}
            aria-hidden="true"
            className={expandido ? 'gr-chevron is-abierto' : 'gr-chevron'}
          />
          <span className="gr-galpon-nombre">
            {galpon.nombre}
            <code>{galpon.codigo}</code>
          </span>
        </button>

        <div className="gr-galpon-resumen">
          <span className={`gr-badge gr-badge--${TONO_ESTADO[galpon.estadoOperativo]}`}>
            <span className="gr-badge-punto" aria-hidden="true" />
            {ETIQUETA_ESTADO[galpon.estadoOperativo]}
          </span>
          {temperatura && (
            <span className="gr-lectura" title="Temperatura">
              <IcThermo size={13} aria-hidden="true" />
              {formatear(temperatura.valor, temperatura.unidad)}
            </span>
          )}
          {humedad && (
            <span className="gr-lectura" title="Humedad">
              <IcDrop size={13} aria-hidden="true" />
              {formatear(humedad.valor, humedad.unidad)}
            </span>
          )}
          {galpon.alertasAbiertas > 0 && (
            <span className="gr-lectura is-alerta" title="Alertas abiertas">
              <IcAlert size={13} aria-hidden="true" />
              {galpon.alertasAbiertas}
            </span>
          )}
          <span className="gr-galpon-capacidad">
            {galpon.loteEnCurso ? (
              <>
                <strong>{aves.toLocaleString()}</strong>
                {galpon.capacidadAves !== null && ` / ${galpon.capacidadAves.toLocaleString()}`}
                {ocupacion !== null && <em> · {ocupacion.toFixed(0)} %</em>}
              </>
            ) : (
              'Sin lote en curso'
            )}
          </span>
          <MenuAcciones acciones={acciones} etiqueta={`Acciones del galpón ${galpon.nombre}`} />
        </div>
      </div>

      {expandido && (
        <div className="gr-galpon-panel" id={panelId}>
          <div className="gr-lotes-cabecera">
            <h4>Lotes</h4>
            {permisos.crear && (
              <button
                type="button"
                className="gr-accion-suave"
                onClick={() => onCrearLote(galpon)}
              >
                <IcPlus size={13} aria-hidden="true" />
                Crear lote
              </button>
            )}
          </div>

          {galpon.lotes.length === 0 ? (
            <div className="gr-vacio gr-vacio--anidado">
              <p>Este galpón todavía no tiene lotes registrados.</p>
              {permisos.crear && (
                <button
                  type="button"
                  className="gr-btn gr-btn--suave"
                  onClick={() => onCrearLote(galpon)}
                >
                  Crear primer lote
                </button>
              )}
            </div>
          ) : (
            <div className="gr-lotes">
              {galpon.lotes.map((lote) => (
                <FilaLote
                  key={lote.id}
                  lote={lote}
                  indicadores={indicadoresPorLote.get(lote.id)}
                  consumo={consumoPorLote.get(lote.id)}
                  permisos={permisos}
                  onEditar={onEditarLote}
                  onAlternar={onAlternarLote}
                  onEliminar={onEliminarLote}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default AcordeonGalpon
