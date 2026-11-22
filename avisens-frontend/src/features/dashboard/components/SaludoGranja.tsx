import type { ReactNode } from 'react'
import BannerSaludo from '@shared/ui/BannerSaludo/BannerSaludo'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcCheck,
  IcCloud,
  IcEgg,
  IcThermo,
} from '@shared/ui/icons/icons'
import type { CifraCabecera } from '../model/cabecera'
import type { DashboardGranja } from '../model/dashboard'
import type { FaseDelDia } from '../model/escenaGalpon'

type Props = {
  saludo: string
  nombre: string
  fecha: string
  clima: string | null
  fase: FaseDelDia
  cifras: CifraCabecera[]
  granjas: DashboardGranja[]
  granjaId: number | null
  onGranjaChange: (id: number) => void
  onIrAGranja?: () => void
  onClickCifra?: (id: CifraCabecera['id']) => void
}

type TonoKpi = 'primario' | 'ok' | 'info' | 'alerta' | 'peligro'

function estiloCifra(cifra: CifraCabecera): { tono: TonoKpi; icono: ReactNode; nota: string } {
  if (cifra.id === 'galpones') {
    return {
      tono: 'primario',
      icono: <IcBarn size={15} />,
      nota: 'Con producción activa',
    }
  }
  if (cifra.id === 'aves') {
    return {
      tono: 'ok',
      icono: <IcEgg size={15} />,
      nota: 'Población en la granja',
    }
  }
  if (cifra.id === 'alertas') {
    return {
      tono: cifra.alerta ? 'peligro' : 'ok',
      icono: cifra.alerta ? <IcAlert size={15} /> : <IcCheck size={15} />,
      nota: cifra.alerta ? 'Requieren revisión' : 'Sin alertas abiertas',
    }
  }
  return {
    tono: cifra.alerta ? 'alerta' : 'info',
    icono: <IcThermo size={15} />,
    nota: cifra.alerta ? 'Algunos sin señal actual' : 'Monitoreo ambiental',
  }
}

function SaludoGranja({
  saludo,
  nombre,
  fecha,
  clima,
  fase,
  cifras,
  granjas,
  granjaId,
  onGranjaChange,
  onIrAGranja,
  onClickCifra,
}: Props) {
  const granja = granjas.find((item) => item.id === granjaId)

  return (
    <div className="rp-cabecera-bloque">
      <BannerSaludo
        fecha={fecha}
        contexto={granja && granjas.length === 1 ? granja.nombre : null}
        titulo={nombre ? `${saludo}, ${nombre}` : saludo}
        fase={fase}
        subtitulo={clima ? (
          <>
            <IcCloud size={17} aria-hidden="true" />
            {clima}
          </>
        ) : undefined}
        acciones={(granjas.length > 1 || onIrAGranja) ? (
          <>
            {granjas.length > 1 && (
              <label className="bs-selector">
                <span className="sr-only">Granja</span>
                <select value={granjaId ?? ''} onChange={(evento) => onGranjaChange(Number(evento.target.value))}>
                  {granjas.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>
            )}
            {onIrAGranja && (
              <button type="button" className="bs-btn" onClick={onIrAGranja}>
                Ir a mi granja
                <IcArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </>
        ) : undefined}
      />

      <section className="adm-kpis" aria-label="Indicadores generales de la granja">
        {cifras.map((cifra) => {
          const { tono, icono, nota } = estiloCifra(cifra)
          return (
            <button
              key={cifra.id}
              type="button"
              className={`adm-kpi adm-kpi--${tono}`}
              onClick={() => onClickCifra?.(cifra.id)}
            >
              <span className="adm-kpi-cab">
                <span className="adm-kpi-etiqueta">{cifra.etiqueta}</span>
                <span className="adm-kpi-icono" aria-hidden="true">{icono}</span>
              </span>
              <strong className={`adm-kpi-valor${cifra.alerta ? ' is-tono' : ''}`}>{cifra.valor}</strong>
              <span className="adm-kpi-nota">{nota}</span>
            </button>
          )
        })}
      </section>
    </div>
  )
}

export default SaludoGranja
