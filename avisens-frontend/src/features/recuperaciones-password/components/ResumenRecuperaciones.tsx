import type { RecuperacionPassword } from '../model/recuperacionPassword'

function ResumenRecuperaciones({ solicitudes }: { solicitudes: RecuperacionPassword[] }) {
  const pendientes = solicitudes.filter(({ estado }) => estado === 'pendiente').length
  const aprobadas = solicitudes.filter(({ estado }) => estado === 'aprobada').length
  const cerradas = solicitudes.filter(
    ({ estado }) => estado === 'rechazada' || estado === 'completada',
  ).length
  const indicadores = [
    { etiqueta: 'Total', valor: solicitudes.length, tono: 'neutro' },
    { etiqueta: 'Por revisar', valor: pendientes, tono: 'pendiente' },
    { etiqueta: 'Acceso temporal', valor: aprobadas, tono: 'aprobada' },
    { etiqueta: 'Cerradas', valor: cerradas, tono: 'cerrada' },
  ]

  return (
    <section className="rec-resumen" aria-label="Resumen de recuperaciones de contraseña">
      <div className="rec-intro">
        <p className="rec-kicker">Seguridad de cuentas</p>
        <h1>Recuperación de acceso</h1>
        <p>Revisa las solicitudes de propietarios y operarios. Al aprobar, AVISENS genera una contraseña temporal de un solo uso.</p>
      </div>
      <div className="rec-indicadores">
        {indicadores.map((indicador) => (
          <article className={`rec-indicador rec-indicador--${indicador.tono}`} key={indicador.etiqueta}>
            <strong>{indicador.valor}</strong>
            <span>{indicador.etiqueta}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ResumenRecuperaciones
