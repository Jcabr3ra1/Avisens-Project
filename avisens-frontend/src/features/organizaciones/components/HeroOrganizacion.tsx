import { IcEdit, IcPlay, IcStop, IcTrash } from '@shared/ui/icons/icons'
import type { OrganizacionDetalle } from '../api/organizaciones'
import { etiquetaPlan, fechaCorta } from '../model/organizacion'
import fotoOrganizacion from '../assets/organizacion-granja.webp'
import NumeroAnimado from './NumeroAnimado'

interface Props {
  detalle: OrganizacionDetalle
  granjaActivaId: number | null
  alElegirGranja: (granjaId: number) => void
  alEditar?: () => void
  alAlternarEstado?: () => void
  alEliminar?: () => void
}

function HeroOrganizacion({
  detalle,
  granjaActivaId,
  alElegirGranja,
  alEditar,
  alAlternarEstado,
  alEliminar,
}: Props) {
  const galpones = detalle.granjas.flatMap((granja) => granja.galpones)
  const sensores = galpones.reduce((suma, galpon) => suma + galpon._count.sensores, 0)
  const metricas = [
    { label: 'Granjas', valor: detalle._count.granjas },
    { label: 'Galpones', valor: galpones.length },
    { label: 'Personas', valor: detalle._count.usuarios },
    { label: 'Sensores', valor: sensores },
  ]

  return (
    <aside className="org-perfil" aria-labelledby="org-perfil-titulo">
      <div className="org-perfil-portada">
        <img
          src={fotoOrganizacion}
          alt={`Operación avícola de ${detalle.nombre}`}
        />
        <div className="org-perfil-portada-badges">
          <span className={`org-perfil-estado${detalle.activa ? ' is-activa' : ''}`}>
            <span className="org-perfil-estado-punto" aria-hidden="true" />
            {detalle.activa ? 'Activa' : 'Suspendida'}
          </span>
          <span className="org-perfil-plan">Plan {etiquetaPlan(detalle.plan)}</span>
        </div>
      </div>

      <div className="org-perfil-cuerpo">
        <span className="org-perfil-eyebrow">Organización Avisens</span>
        <h1 id="org-perfil-titulo" className="org-perfil-titulo">{detalle.nombre}</h1>

        <dl className="org-perfil-datos">
          <div>
            <dt>NIT</dt>
            <dd>{detalle.nit ?? 'Sin registrar'}</dd>
          </div>
          <div>
            <dt>Organización desde</dt>
            <dd>{fechaCorta(detalle.fecha_creacion)}</dd>
          </div>
        </dl>

        <ul className="org-perfil-metricas" aria-label={`Resumen de ${detalle.nombre}`}>
          {metricas.map((metrica, indice) => (
            <li key={metrica.label}>
              <strong><NumeroAnimado valor={metrica.valor} retrasoMs={120 + indice * 60} /></strong>
              <span>{metrica.label}</span>
            </li>
          ))}
        </ul>

        {detalle.granjas.length > 0 && (
          <div className="org-perfil-granjas">
            <span className="org-perfil-seccion-titulo">Granjas ({detalle.granjas.length})</span>
            <ul className="org-perfil-granjas-lista">
              {detalle.granjas.map((granja) => {
                const seleccionada = granja.id === granjaActivaId
                return (
                  <li key={granja.id}>
                    <button
                      type="button"
                      className={`org-perfil-granja-btn${seleccionada ? ' is-activa' : ''}`}
                      onClick={() => alElegirGranja(granja.id)}
                    >
                      <span className={`org-perfil-granja-punto${granja.activa ? ' is-activa' : ''}`} aria-hidden="true" />
                      <span className="org-perfil-granja-nombre">{granja.nombre}</span>
                      <small>{granja.galpones.length}</small>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {(alEditar || alAlternarEstado || alEliminar) && (
          <div className="org-perfil-acciones">
            <div className="org-perfil-acciones-fila">
              {alEditar && (
                <button type="button" className="org-perfil-btn" onClick={alEditar}>
                  <IcEdit size={14} aria-hidden="true" /> Editar
                </button>
              )}
              {alAlternarEstado && (
                <button
                  type="button"
                  className={`org-perfil-btn${detalle.activa ? ' is-aviso' : ''}`}
                  onClick={alAlternarEstado}
                >
                  {detalle.activa ? <IcStop size={14} aria-hidden="true" /> : <IcPlay size={14} aria-hidden="true" />}
                  {detalle.activa ? 'Suspender' : 'Reactivar'}
                </button>
              )}
            </div>
            {alEliminar && (
              <button type="button" className="org-perfil-eliminar" onClick={alEliminar}>
                <IcTrash size={14} aria-hidden="true" /> Eliminar organización
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default HeroOrganizacion
