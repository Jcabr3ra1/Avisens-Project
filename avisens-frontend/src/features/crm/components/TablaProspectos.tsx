import { IcSearch } from '@shared/ui/icons/icons'
import { ETAPAS, type EtapaProspecto, type ProspectoVista } from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import type { Filtro } from '../hooks/useFiltroProspectos'
import FilaProspecto from './FilaProspecto'

type Props = {
  prospectos: ProspectoVista[]
  filtro: Filtro
  onFiltrar: (filtro: Filtro) => void
  conteos: Record<EtapaProspecto, number>
  total: number
  onAbrir: (prospecto: ProspectoVista) => void
}

const COLUMNAS = [
  'Prospecto',
  'Granja',
  'Municipio',
  'Área galpón',
  'Puntaje',
  'Días',
  'Estado',
  'Contacto',
]

function TablaProspectos({ prospectos, filtro, onFiltrar, conteos, total, onAbrir }: Props) {
  return (
    <>
      <div className="crm-filtros">
        <button
          className={`crm-filtro${filtro === 'todos' ? ' crm-filtro--activo' : ''}`}
          onClick={() => onFiltrar('todos')}
        >
          Todos ({total})
        </button>
        {ETAPAS.map((etapa) => (
          <button
            key={etapa}
            className={`crm-filtro${filtro === etapa ? ' crm-filtro--activo' : ''}`}
            onClick={() => onFiltrar(etapa)}
          >
            {ESTILO_ETAPA[etapa].icono} {ESTILO_ETAPA[etapa].label} ({conteos[etapa]})
          </button>
        ))}
      </div>

      <div className="crm-tabla-card">
        <table className="crm-tabla">
          <thead>
            <tr>
              {COLUMNAS.map((columna) => (
                <th key={columna}>{columna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prospectos.map((prospecto) => (
              <FilaProspecto
                key={prospecto.id}
                prospecto={prospecto}
                onAbrir={() => onAbrir(prospecto)}
              />
            ))}
          </tbody>
        </table>

        {prospectos.length === 0 && (
          <div className="crm-vacio">
            <span className="crm-vacio-emoji">
              <IcSearch size={22} />
            </span>
            <p>No hay prospectos que coincidan con la búsqueda</p>
          </div>
        )}
      </div>
    </>
  )
}

export default TablaProspectos
