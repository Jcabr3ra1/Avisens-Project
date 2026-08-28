import type { ResumenDeUsuarios } from '../hooks/useResumenUsuarios'

type Props = {
  resumen: ResumenDeUsuarios
  esPropietario: boolean
}

function ResumenUsuarios({ resumen, esPropietario }: Props) {
  return (
    <div className="usuarios-resumen">
      <div className="usuarios-stat">
        <span className="usuarios-stat-valor">{resumen.total}</span>
        <span className="usuarios-stat-label">{esPropietario ? 'Operarios' : 'Total'}</span>
      </div>
      <div className="usuarios-stat usuarios-stat--activo">
        <span className="usuarios-stat-valor">{resumen.activos}</span>
        <span className="usuarios-stat-label">Activos</span>
      </div>
      {!esPropietario && (
        <>
          <div className="usuarios-stat">
            <span className="usuarios-stat-valor">{resumen.propietarios}</span>
            <span className="usuarios-stat-label">Propietarios</span>
          </div>
          <div className="usuarios-stat">
            <span className="usuarios-stat-valor">{resumen.operarios}</span>
            <span className="usuarios-stat-label">Operarios</span>
          </div>
        </>
      )}
    </div>
  )
}

export default ResumenUsuarios
