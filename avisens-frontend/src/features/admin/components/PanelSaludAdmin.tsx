import type { CSSProperties } from 'react'
import IconoFigma from '@shared/ui/icons/IconoFigma'
import { haceCuanto, type ConectividadPlataforma } from '../model/conectividad'

type Props = {
  conectividad: ConectividadPlataforma | null
  cargando: boolean
  error: boolean
  onReintentar: () => void
  onAbrirOrganizacion: (id: number) => void
  onIrDispositivos: () => void
}

function PanelSaludAdmin({ conectividad, cargando, error, onReintentar, onAbrirOrganizacion, onIrDispositivos }: Props) {
  const problemas = conectividad?.problemas ?? []
  const ventana = conectividad?.ventana_minutos ?? 15
  const total = conectividad?.total ?? 0
  const todosBien = !!conectividad && total > 0 && problemas.length === 0
  const estados = conectividad
    ? [
        { clave: 'conectado', etiqueta: 'Reportando', valor: conectividad.conectados },
        { clave: 'sin-reportar', etiqueta: 'Sin reportar', valor: conectividad.sin_reportar },
        { clave: 'nunca', etiqueta: 'Sin primer reporte', valor: conectividad.nunca },
      ]
    : []

  return (
    <section id="admin-salud" className="cdc-panel cdc-salud cdc-entra" style={{ '--i': 6 } as CSSProperties} aria-labelledby="cdc-salud-titulo" aria-busy={cargando}>
      <header className="cdc-panel-cabecera">
        <div>
          <h2 id="cdc-salud-titulo">Controladores</h2>
          <p>Señal de los ESP32 en los últimos {ventana} minutos</p>
        </div>
        {todosBien && <span className="cdc-en-vivo"><i aria-hidden="true" />En línea</span>}
      </header>

      {error ? (
        <div className="cdc-error" role="alert">
          <span>No se pudo consultar el estado de los controladores.</span>
          <button type="button" onClick={onReintentar}>Reintentar</button>
        </div>
      ) : cargando && !conectividad ? (
        <div className="cdc-filas-esqueleto" aria-label="Consultando controladores"><span /><span /></div>
      ) : total === 0 ? (
        <div className="cdc-vacio">
          <IconoFigma nombre="servidor" tamano={22} />
          <strong>Sin controladores instalados</strong>
          <p>Cuando se vincule el primer ESP32 verás aquí su señal.</p>
        </div>
      ) : (
        <>
          <ul className="cdc-estados">
            {estados.map((estado) => (
              <li key={estado.clave} className={`cdc-estado cdc-estado--${estado.clave}${estado.valor === 0 ? ' is-cero' : ''}`}>
                <i aria-hidden="true" />
                <span>{estado.etiqueta}</span>
                <strong>{estado.valor}</strong>
              </li>
            ))}
          </ul>

          {todosBien ? (
            <p className="cdc-salud-ok">
              <IconoFigma nombre="verificado" tamano={17} />
              {total === 1 ? 'El controlador reporta' : `Los ${total} controladores reportan`} con normalidad.
            </p>
          ) : (
            <ul className="cdc-casos cdc-casos--compactos">
              {problemas.map((controlador, posicion) => (
                <li key={controlador.id} style={{ '--k': posicion } as CSSProperties}>
                  <button type="button" className="cdc-caso cdc-caso--alerta" onClick={() => onAbrirOrganizacion(controlador.galpon.granja.organizacion.id)}>
                    <span className="cdc-caso-icono" aria-hidden="true"><IconoFigma nombre="servidor" tamano={16} /></span>
                    <span className="cdc-caso-texto">
                      <span className="cdc-caso-meta">{controlador.estado === 'nunca' ? 'Sin primer reporte' : haceCuanto(controlador.ultima_conexion)}</span>
                      <strong>{controlador.nombre ?? controlador.codigo_topic}</strong>
                      <small>{controlador.galpon.granja.organizacion.nombre} · {controlador.galpon.granja.nombre} · {controlador.galpon.nombre}</small>
                    </span>
                    <IconoFigma nombre="flecha-derecha" tamano={16} className="cdc-flecha" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <footer className="cdc-panel-pie">
        <button type="button" onClick={onIrDispositivos}>Abrir dispositivos</button>
      </footer>
    </section>
  )
}

export default PanelSaludAdmin
