import type { FilaGalpon } from '../model/resumenGranja'
import galponImagen from '../assets/escena/galpon-v4-low-poly.webp'

type Props = {
  filas: FilaGalpon[]
  galponId: number | null
  onSeleccionar: (id: number) => void
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const DIAS_CURVA_ESTANDAR = 42

type Estado = { tono: 'ok' | 'atencion' | 'critico' | 'inactivo'; texto: string }

function estadoDeFila(fila: FilaGalpon): Estado {
  if (!fila.activo) return { tono: 'inactivo', texto: 'Inactivo' }
  if (fila.urgentes > 0) return { tono: 'critico', texto: `${fila.urgentes} ${fila.urgentes === 1 ? 'crítica' : 'críticas'}` }
  if (fila.alertas > 0) return { tono: 'atencion', texto: `${fila.alertas} ${fila.alertas === 1 ? 'alerta' : 'alertas'}` }
  if (!fila.lote) return { tono: 'inactivo', texto: 'Sin lote' }
  return { tono: 'ok', texto: 'En orden' }
}

function PanelGalpones({ filas, galponId, onSeleccionar }: Props) {
  return (
    <section className="rsm-galpones" aria-labelledby="resumen-galpones-titulo">
      <header className="rsm-cabecera">
        <div>
          <h2 id="resumen-galpones-titulo" className="rsm-titulo">Tus galpones</h2>
          <p className="rsm-subtitulo">Elige uno para ver su detalle</p>
        </div>
      </header>

      <ul className="rsm-galpones-lista">
        {filas.map((fila) => {
          const seleccionado = fila.id === galponId
          const estado = estadoDeFila(fila)
          const progreso = fila.lote ? Math.min(100, Math.round((fila.lote.dia / DIAS_CURVA_ESTANDAR) * 100)) : 0
          return (
            <li key={fila.id}>
              <button
                type="button"
                className={`rsm-galpon rsm-galpon--${estado.tono}${seleccionado ? ' is-seleccionado' : ''}`}
                aria-pressed={seleccionado}
                onClick={() => onSeleccionar(fila.id)}
              >
                <span className="rsm-galpon-vista" aria-hidden="true">
                  <img src={galponImagen} alt="" />
                  <span className={`rsm-estado rsm-estado--${estado.tono}`}>{estado.texto}</span>
                </span>

                <span className="rsm-galpon-cuerpo">
                  <span className="rsm-galpon-nombre">
                    <strong>{fila.nombre}</strong>
                    <span>{fila.codigo}</span>
                  </span>

                  <span className="rsm-galpon-lote">
                    {fila.lote
                      ? `${fila.lote.codigo} · ${enteros.format(fila.lote.aves)} aves`
                      : 'Sin lote activo'}
                  </span>

                  {fila.lecturas.length > 0 && (
                    <span className="rsm-galpon-lecturas">{fila.lecturas.join(' · ')}</span>
                  )}

                  {fila.lote && (
                    <span
                      className="rsm-ciclo"
                      role="img"
                      aria-label={`Día ${fila.lote.dia} de ${DIAS_CURVA_ESTANDAR} de la curva estándar`}
                    >
                      <span className="rsm-ciclo-barra"><span style={{ width: `${progreso}%` }} /></span>
                      <span className="rsm-ciclo-texto">Día {fila.lote.dia} de {DIAS_CURVA_ESTANDAR}</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default PanelGalpones
