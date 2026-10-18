import type { Lote } from '@features/lotes/api/lotes'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { IcArrowRight, IcEgg } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { faltantesLote, textoFaltantes } from '../../model/datosDescriptivos'
import { avesActuales, diasDeVida } from '../../model/estructura'

type Props = {
  galpon: GalponConLotes
  indicador: DashboardIndicador | null
  consumo: { alimentoKg: number; aguaLitros: number } | undefined
  onEditarDatos: (lote: Lote) => void
  onNavegar: (ruta: string) => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

const ESTADOS: Record<string, string> = { activo: 'En curso', finalizado: 'Finalizado', inactivo: 'Inactivo' }

function LotePestana({ galpon, indicador, consumo, onEditarDatos, onNavegar }: Props) {
  const lote = galpon.loteEnCurso
  const historial = galpon.lotes.filter((item) => item.id !== lote?.id)

  return (
    <div className="gp-lote">
      {!lote ? (
        <div className="gp-curva-vacia">
          <IcEgg size={20} aria-hidden="true" />
          Este galpón no tiene un lote en curso.
        </div>
      ) : (
        <>
          <div className="gp-lote-cabecera">
            <div>
              <span className="gp-rotulo">Lote en curso</span>
              <h3>{lote.codigo}</h3>
              <span className="gp-lote-sub">
                Ingresó el {formatearFechaCalendario(lote.fecha_ingreso)} · día {diasDeVida(lote.fecha_ingreso)}
              </span>
            </div>
            <div className="gp-lote-acciones">
              <button type="button" className="adm-btn adm-btn--secundario" onClick={() => onEditarDatos(lote)}>
                Editar datos del lote
              </button>
              <button type="button" className="adm-btn adm-btn--primario" onClick={() => onNavegar(`/guia-crecimiento?lote=${lote.id}`)}>
                Guía de peso <IcArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <dl className="gp-cifras gp-cifras--seis">
            <div className="gp-cifra">
              <dt>Aves ingresadas</dt>
              <dd>{entero.format(lote.cantidad_inicial)}</dd>
            </div>
            <div className="gp-cifra">
              <dt>Aves vivas</dt>
              <dd>{entero.format(avesActuales(lote.cantidad_inicial, indicador?.mortalidadAcumuladaPct ?? null))}</dd>
            </div>
            <div className="gp-cifra">
              <dt>Mortalidad</dt>
              <dd>{indicador?.mortalidadAcumuladaPct != null ? `${decimal.format(indicador.mortalidadAcumuladaPct)} %` : '—'}</dd>
            </div>
            <div className="gp-cifra">
              <dt>Peso promedio</dt>
              <dd>{indicador?.pesoPromedioG != null ? `${entero.format(indicador.pesoPromedioG)} g` : '—'}</dd>
            </div>
            <div className="gp-cifra">
              <dt>Conversión (FCR)</dt>
              <dd>{indicador?.fcr != null ? indicador.fcr.toFixed(2) : '—'}</dd>
            </div>
            <div className="gp-cifra">
              <dt>Alimento</dt>
              <dd>{consumo && consumo.alimentoKg > 0 ? `${entero.format(consumo.alimentoKg)} kg` : '—'}</dd>
            </div>
          </dl>

          <dl className="gp-ficha">
            <div><dt>Línea genética</dt><dd>{lote.linea_genetica?.nombre ?? <em>Falta</em>}</dd></div>
            <div><dt>Sexo</dt><dd>{lote.sexo ? capitalizar(lote.sexo) : <em>Falta</em>}</dd></div>
            <div><dt>Marca de alimento</dt><dd>{lote.marca_alimento ? capitalizar(lote.marca_alimento) : <em>Falta</em>}</dd></div>
            <div><dt>Proveedor</dt><dd>{lote.proveedor?.nombre ?? <em>Falta</em>}</dd></div>
          </dl>
          {faltantesLote(lote).length > 0 && (
            <p className="gp-nota-falta">
              {textoFaltantes(faltantesLote(lote))}. <button type="button" className="gp-enlace" onClick={() => onEditarDatos(lote)}>Completar ahora</button>
            </p>
          )}
        </>
      )}

      {historial.length > 0 && (
        <section className="gp-bloque" aria-labelledby="gp-historial-titulo">
          <div className="gp-bloque-cabecera">
            <h3 id="gp-historial-titulo">Lotes anteriores</h3>
          </div>
          <ul className="gp-historial">
            {historial.map((item) => (
              <li key={item.id}>
                <code>{item.codigo}</code>
                <span>{formatearFechaCalendario(item.fecha_ingreso)}</span>
                <span>{entero.format(item.cantidad_inicial)} aves</span>
                <span className="gp-historial-estado">{ESTADOS[item.estado] ?? item.estado}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default LotePestana
