import type { ReactNode } from 'react'
import type { Granja } from '../../api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import { IcCheck } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import {
  enlaceMapa, faltantesGalpon, faltantesGranja, faltantesLote, pendientesAdminGranja, textoFaltantes,
} from '../../model/datosDescriptivos'

type Props = {
  granja: Granja
  galpon: GalponConLotes
  onEditarGranja: () => void
  onEditarLote: (lote: Lote) => void
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const falta = <em>Falta</em>
const delAdmin = <em className="gp-dato-admin">Lo registra el administrador</em>
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

function Bloque({ titulo, faltan, pendientesAdmin = [], onEditar, nota, children }: {
  titulo: string
  faltan: string[]
  pendientesAdmin?: string[]
  onEditar?: () => void
  nota?: string
  children: ReactNode
}) {
  const completo = faltan.length === 0
  return (
    <section className={`gp-datos-bloque${completo ? ' is-completo' : ''}`}>
      <header>
        <div>
          <h3>{titulo}</h3>
          <span className="gp-datos-estado">
            {completo ? <><IcCheck size={13} aria-hidden="true" /> Tu parte está completa</> : textoFaltantes(faltan)}
          </span>
          {pendientesAdmin.length > 0 && (
            <span className="gp-datos-admin">
              El administrador tiene pendiente{pendientesAdmin.length > 1 ? 's' : ''} {pendientesAdmin.join(' y ')}.
            </span>
          )}
          {nota && <span className="gp-datos-admin">{nota}</span>}
        </div>
        {onEditar && (
          <button type="button" className={`adm-btn ${completo ? 'adm-btn--secundario' : 'adm-btn--primario'}`} onClick={onEditar}>
            {completo ? 'Editar' : 'Completar'}
          </button>
        )}
      </header>
      <dl className="gp-ficha">{children}</dl>
    </section>
  )
}

function DatosPestana({ granja, galpon, onEditarGranja, onEditarLote }: Props) {
  const lote = galpon.loteEnCurso
  const g = galpon.origen
  return (
    <div className="gp-datos">
      <Bloque
        titulo={`Granja ${granja.nombre}`}
        faltan={faltantesGranja(granja)}
        pendientesAdmin={pendientesAdminGranja(granja)}
        onEditar={onEditarGranja}
      >
        <div><dt>Dirección</dt><dd>{granja.direccion ?? falta}</dd></div>
        <div><dt>Municipio</dt><dd>{granja.municipio && granja.departamento ? `${granja.municipio}, ${granja.departamento}` : falta}</dd></div>
        <div>
          <dt>Coordenadas</dt>
          <dd>
            {granja.latitud !== null && granja.longitud !== null
              ? <a href={enlaceMapa(granja.latitud, granja.longitud)} target="_blank" rel="noreferrer">Ver en el mapa</a>
              : delAdmin}
          </dd>
        </div>
        <div><dt>Área</dt><dd>{granja.area_total_m2 !== null ? `${entero.format(granja.area_total_m2)} m²` : delAdmin}</dd></div>
      </Bloque>

      <Bloque
        titulo={`Galpón ${galpon.nombre}`}
        faltan={[]}
        nota={faltantesGalpon(g).length > 0
          ? 'Las medidas y la instalación las registra el administrador: con ellas se ubican los sensores.'
          : 'Registrado por el administrador al instalar los sensores.'}
      >
        <div><dt>Capacidad</dt><dd>{g.capacidad_aves !== null ? `${entero.format(g.capacidad_aves)} aves` : delAdmin}</dd></div>
        <div><dt>Medidas</dt><dd>{g.ancho_metros !== null && g.largo_metros !== null ? `${entero.format(g.ancho_metros)} × ${entero.format(g.largo_metros)} m` : delAdmin}</dd></div>
        <div><dt>Techo</dt><dd>{g.tipo_techo ? capitalizar(g.tipo_techo) : delAdmin}</dd></div>
        <div><dt>Orientación</dt><dd>{g.orientacion ? capitalizar(g.orientacion.replace('-', ' – ')) : delAdmin}</dd></div>
        <div><dt>Construido</dt><dd>{g.fecha_construccion ? formatearFechaCalendario(g.fecha_construccion) : delAdmin}</dd></div>
      </Bloque>

      {lote && (
        <Bloque titulo={`Lote ${lote.codigo}`} faltan={faltantesLote(lote)} onEditar={() => onEditarLote(lote)}>
          <div><dt>Línea genética</dt><dd>{lote.linea_genetica?.nombre ?? falta}</dd></div>
          <div><dt>Sexo</dt><dd>{lote.sexo ? capitalizar(lote.sexo) : falta}</dd></div>
          <div><dt>Marca de alimento</dt><dd>{lote.marca_alimento ? capitalizar(lote.marca_alimento) : falta}</dd></div>
          <div><dt>Proveedor</dt><dd>{lote.proveedor?.nombre ?? falta}</dd></div>
        </Bloque>
      )}
    </div>
  )
}

export default DatosPestana
