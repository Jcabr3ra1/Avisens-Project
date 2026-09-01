import type { Lote } from '@features/lotes/api/lotes'
import type { PermisosGestion } from '@shared/auth/permisos'
import { avesActuales, diasDeVida } from '../model/estructura'
import type { IndicadoresDeLote } from '../hooks/useIndicadoresDeLotes'
import Badge, { type TonoBadge } from './Badge'
import MenuAcciones from './MenuAcciones'

interface Props {
  lote: Lote
  indicadores: IndicadoresDeLote | undefined
  consumo: { alimentoKg: number; aguaLitros: number } | undefined
  permisos: PermisosGestion
  onEditar: (lote: Lote) => void
  onAlternar: (lote: Lote) => void
  onEliminar: (lote: Lote) => void
}

const TONO: Record<string, TonoBadge> = {
  activo: 'activo',
  finalizado: 'finalizado',
  inactivo: 'neutral',
}

function FilaLote({
  lote,
  indicadores,
  consumo,
  permisos,
  onEditar,
  onAlternar,
  onEliminar,
}: Props) {
  const enCurso = lote.estado === 'activo'
  const ultimo = indicadores?.ultimo ?? null
  const dias = diasDeVida(lote.fecha_ingreso)
  const vivas = avesActuales(lote.cantidad_inicial, ultimo?.mortalidadAcumuladaPct ?? null)

  const acciones = [
    ...(permisos.editar ? [{ etiqueta: 'Editar lote', onSeleccionar: () => onEditar(lote) }] : []),
    ...(permisos.alternarActivo
      ? [{ etiqueta: enCurso ? 'Desactivar' : 'Activar', onSeleccionar: () => onAlternar(lote) }]
      : []),
    ...(permisos.eliminar
      ? [{ etiqueta: 'Eliminar lote', onSeleccionar: () => onEliminar(lote), peligrosa: true }]
      : []),
  ]

  return (
    <article className={`gr-lote${enCurso ? ' is-en-curso' : ''}`}>
      <div className="gr-lote-cabecera">
        <div className="gr-lote-identidad">
          <code>{lote.codigo}</code>
          <Badge tono={TONO[lote.estado] ?? 'neutral'} />
        </div>
        <MenuAcciones acciones={acciones} etiqueta={`Acciones del lote ${lote.codigo}`} />
      </div>

      {enCurso ? (
        <dl className="gr-lote-metricas">
          <div>
            <dt>Edad</dt>
            <dd>{dias} días</dd>
          </div>
          <div>
            <dt>Aves</dt>
            <dd>
              {ultimo?.mortalidadAcumuladaPct != null
                ? vivas.toLocaleString()
                : lote.cantidad_inicial.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Peso prom.</dt>
            <dd>
              {ultimo?.pesoPromedioG != null ? (
                `${Math.round(ultimo.pesoPromedioG).toLocaleString()} g`
              ) : (
                <span className="gr-sin-dato">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Mortalidad</dt>
            <dd className={(ultimo?.mortalidadAcumuladaPct ?? 0) > 5 ? 'is-alerta' : undefined}>
              {ultimo?.mortalidadAcumuladaPct != null ? (
                `${ultimo.mortalidadAcumuladaPct.toFixed(1)} %`
              ) : (
                <span className="gr-sin-dato">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt>FCR</dt>
            <dd>
              {ultimo?.fcr != null ? ultimo.fcr.toFixed(2) : <span className="gr-sin-dato">—</span>}
            </dd>
          </div>
          <div>
            <dt>Alimento</dt>
            <dd>
              {consumo && consumo.alimentoKg > 0 ? (
                `${consumo.alimentoKg.toLocaleString()} kg`
              ) : (
                <span className="gr-sin-dato">—</span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="gr-lote-historico">
          {dias} días · {lote.cantidad_inicial.toLocaleString()} aves ingresadas
          {lote.fecha_salida_real && ` · Cierre ${lote.fecha_salida_real.slice(0, 10)}`}
        </p>
      )}
    </article>
  )
}

export default FilaLote
