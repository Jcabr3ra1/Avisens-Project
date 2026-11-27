type Props = {
  mensaje: string | null
  clasificacion: string | null
  onInicio: () => void
}

const SIN_CONSENTIMIENTO = 'sin_consentimiento'

// Lo que sigue tras la cotización, dicho con las mismas promesas que el cierre
// de WhatsApp. Al visitante no se le muestra su puntaje ni si es «caliente» o
// «frío»: eso es una clasificación interna de ventas, no algo que él deba leer.
const SIGUIENTE_PASO: Record<string, string> = {
  caliente:
    'Un asesor comercial te contacta en las próximas 24 horas para coordinar una visita técnica y afinar tu propuesta.',
  tibio:
    'Te invitamos a una demostración remota para que veas la plataforma funcionando y resolvamos tus dudas antes de decidir.',
  frio:
    'Te enviamos información útil sobre monitoreo y bienestar de las aves, y quedamos pendientes para cuando quieras dar el siguiente paso.',
}
const SIGUIENTE_PASO_GENERICO = 'Un asesor te contacta con la cotización.'

function contenido(clasificacion: string | null): { titulo: string; siguiente: string | null } {
  if (clasificacion === SIN_CONSENTIMIENTO) return { titulo: 'Conversación cerrada', siguiente: null }
  if (clasificacion === 'pqrs') return { titulo: 'Solicitud radicada', siguiente: null }
  if (clasificacion === 'consulta_atendida') {
    return { titulo: 'Consulta resuelta', siguiente: 'Si quieres acompañamiento, vuelve al inicio y elige «Quiero cotizar».' }
  }
  return {
    titulo: 'Listo',
    siguiente: SIGUIENTE_PASO[clasificacion ?? ''] ?? SIGUIENTE_PASO_GENERICO,
  }
}

function VistaFin({ mensaje, clasificacion, onInicio }: Props) {
  const { titulo, siguiente } = contenido(clasificacion)

  return (
    <div className="float-fin">
      <h3 className="float-paso-titulo">{titulo}</h3>
      {mensaje ? <p className="float-paso-texto">{mensaje}</p> : null}
      {siguiente ? (
        <div className="float-result">
          <span>Lo que sigue</span>
          <p>{siguiente}</p>
        </div>
      ) : null}
      <button type="button" className="float-dudas-asesor float-fin-inicio" onClick={onInicio}>
        <span>Volver al inicio</span>
      </button>
    </div>
  )
}

export default VistaFin
