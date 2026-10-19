import type { ResumenAlertas as Resumen } from '../model/alerta'

interface ResumenAlertasProps {
  resumen: Resumen
  cargando: boolean
}

function ResumenAlertas({ resumen, cargando }: ResumenAlertasProps) {
  const valor = (numero: number) => (cargando ? '—' : numero)
  return (
    <ul className="ale-indicadores" aria-label="Resumen de alertas">
      <li><span>Registradas</span><strong>{valor(resumen.total)}</strong><small>En todos los galpones</small></li>
      <li><span>Por atender</span><strong className={resumen.abiertas > 0 ? 'ale-indicador--aviso' : undefined}>{valor(resumen.abiertas)}</strong><small>{resumen.abiertas > 0 ? 'Esperan a alguien' : 'Nada pendiente'}</small></li>
      <li><span>En atención</span><strong>{valor(resumen.enProceso)}</strong><small>Ya tienen responsable</small></li>
      <li><span>Críticas activas</span><strong className={resumen.criticas > 0 ? 'ale-indicador--peligro' : undefined}>{valor(resumen.criticas)}</strong><small>{resumen.criticas > 0 ? 'Requieren acción inmediata' : 'Ninguna en este momento'}</small></li>
    </ul>
  )
}

export default ResumenAlertas
