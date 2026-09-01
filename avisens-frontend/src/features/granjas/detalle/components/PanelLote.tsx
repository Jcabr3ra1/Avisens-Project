import type { Lote } from '@features/lotes/api/lotes'
import { avesActuales, diasDeVida } from '../model/granjaDetalle'
import type { DetalleLote } from '../hooks/useDetalleLote'
import Dato from './Dato'
import MiniGrafica from './MiniGrafica'

interface Props {
  lote: Lote
  detalle: DetalleLote
}

function PanelLote({ lote, detalle }: Props) {
  const { ultimo, serie } = detalle
  const dias = diasDeVida(lote.fecha_ingreso)
  const vivas = avesActuales(lote.cantidad_inicial, ultimo?.mortalidadAcumuladaPct ?? null)

  if (detalle.cargando) {
    return <p className="gd-cargando">Cargando indicadores del lote…</p>
  }

  return (
    <div className="gd-panel-lote">
      <div className="gd-bloque">
        <h4 className="gd-bloque-titulo">Información general</h4>
        <div className="gd-datos">
          <Dato etiqueta="Ingreso" valor={lote.fecha_ingreso.slice(0, 10)} />
          <Dato etiqueta="Edad" valor={dias} sufijo="días" />
          <Dato etiqueta="Aves ingresadas" valor={lote.cantidad_inicial.toLocaleString()} />
          <Dato
            etiqueta="Aves actuales"
            valor={ultimo?.mortalidadAcumuladaPct != null ? vivas.toLocaleString() : null}
          />
          <Dato
            etiqueta="Mortalidad"
            valor={ultimo?.mortalidadAcumuladaPct?.toFixed(2) ?? null}
            sufijo="%"
            tono={(ultimo?.mortalidadAcumuladaPct ?? 0) > 5 ? 'alerta' : 'normal'}
          />
          <Dato etiqueta="Raza" valor={lote.raza} />
        </div>
      </div>

      <div className="gd-bloque">
        <h4 className="gd-bloque-titulo">
          Desempeño
          {serie.length === 0 && (
            <span className="gd-bloque-nota">Sin indicadores calculados todavía</span>
          )}
        </h4>
        <div className="gd-datos">
          <Dato
            etiqueta="Peso promedio"
            valor={
              ultimo?.pesoPromedioG != null ? (ultimo.pesoPromedioG / 1000).toFixed(3) : null
            }
            sufijo="kg"
          />
          <Dato etiqueta="Conversión (FCR)" valor={ultimo?.fcr?.toFixed(2) ?? null} />
          <Dato etiqueta="EPEF" valor={ultimo?.epef?.toFixed(0) ?? null} />
          <Dato
            etiqueta="Alimento acumulado"
            valor={detalle.alimentoKg > 0 ? detalle.alimentoKg.toLocaleString() : null}
            sufijo="kg"
          />
          <Dato
            etiqueta="Agua acumulada"
            valor={detalle.aguaLitros > 0 ? detalle.aguaLitros.toLocaleString() : null}
            sufijo="L"
          />
          <Dato etiqueta="Alimento" valor={lote.marca_alimento} />
        </div>
      </div>

      <div className="gd-bloque">
        <h4 className="gd-bloque-titulo">Evolución</h4>
        <div className="gd-graficas">
          <MiniGrafica
            titulo="Peso promedio"
            valores={serie.map((punto) =>
              punto.pesoPromedioG === null ? null : punto.pesoPromedioG / 1000,
            )}
            unidad=" kg"
            decimales={2}
          />
          <MiniGrafica
            titulo="Mortalidad acumulada"
            valores={serie.map((punto) => punto.mortalidadAcumuladaPct)}
            unidad=" %"
            decimales={2}
          />
          <MiniGrafica
            titulo="Conversión alimenticia"
            valores={serie.map((punto) => punto.fcr)}
            decimales={2}
          />
        </div>
      </div>
    </div>
  )
}

export default PanelLote
