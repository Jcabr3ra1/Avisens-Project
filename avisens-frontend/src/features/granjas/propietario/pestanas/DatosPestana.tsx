import type { ReactNode } from 'react'
import type { Granja } from '../../api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import { IcAlert, IcCheck, IcEdit } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import {
  enlaceMapa, faltantesGalpon, faltantesGranja, faltantesLote, pendientesAdminGranja, textoFaltantes,
} from '../../model/datosDescriptivos'
import { diasDeVida } from '../../model/estructura'
import { lotesActivosDeGalpon } from '../explorador'

type Props = {
  granja: Granja
  galpon: GalponConLotes
  onEditarGranja?: () => void
  onEditarLote?: (lote: Lote) => void
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const enteroPuro = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const falta = <em className="gp-dato-falta">Pendiente</em>
const sinRegistrar = <em className="gp-dato-admin">Sin registrar</em>
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

function Bloque({
  eyebrow,
  titulo,
  faltan,
  pendientesAdmin = [],
  onEditar,
  nota,
  children,
}: {
  eyebrow: string
  titulo: string
  faltan: string[]
  pendientesAdmin?: string[]
  onEditar?: () => void
  nota?: string
  children: ReactNode
}) {
  const completo = faltan.length === 0
  return (
    <section className={`gp-datos-bloque${completo ? ' is-completo' : ' is-pendiente'}`}>
      <header className="gp-datos-cabecera">
        <div className="gp-datos-titulo-wrap">
          <div className="gp-datos-top">
            <span className="gp-rotulo">{eyebrow}</span>
            <span className={`gp-datos-estado${completo ? ' is-completo' : ' is-pendiente'}`}>
              {completo ? (
                <><IcCheck size={12} aria-hidden="true" /> Completo</>
              ) : (
                <><IcAlert size={12} aria-hidden="true" /> {textoFaltantes(faltan)}</>
              )}
            </span>
          </div>
          <h3>{titulo}</h3>
          {pendientesAdmin.length > 0 && (
            <p className="gp-datos-admin">
              Soporte técnico tiene pendiente{pendientesAdmin.length > 1 ? 's' : ''} {pendientesAdmin.join(' y ')}.
            </p>
          )}
          {nota && <p className="gp-datos-admin">{nota}</p>}
        </div>

        {onEditar && (
          <button
            type="button"
            className={`adm-btn ${completo ? 'adm-btn--secundario' : 'adm-btn--primario'}`}
            onClick={onEditar}
          >
            <IcEdit size={14} aria-hidden="true" />
            {completo ? 'Editar' : 'Completar'}
          </button>
        )}
      </header>

      <dl className="gp-ficha">{children}</dl>
    </section>
  )
}

function DatosPestana({ granja, galpon, onEditarGranja, onEditarLote }: Props) {
  const activos = lotesActivosDeGalpon(galpon)
  const g = galpon.origen
  return (
    <div className="gp-datos">
      <Bloque
        eyebrow="Ubicación y granja"
        titulo={granja.nombre}
        faltan={faltantesGranja(granja)}
        pendientesAdmin={pendientesAdminGranja(granja)}
        onEditar={onEditarGranja}
      >
        <div><dt>Dirección</dt><dd>{granja.direccion ?? falta}</dd></div>
        <div>
          <dt>Municipio</dt>
          <dd>{granja.municipio && granja.departamento ? `${granja.municipio}, ${granja.departamento}` : falta}</dd>
        </div>
        <div>
          <dt>Coordenadas</dt>
          <dd>
            {granja.latitud !== null && granja.longitud !== null
              ? <a href={enlaceMapa(granja.latitud, granja.longitud)} target="_blank" rel="noreferrer">Ver en el mapa</a>
              : sinRegistrar}
          </dd>
        </div>
        <div>
          <dt>Área total</dt>
          <dd>{granja.area_total_m2 !== null ? `${entero.format(granja.area_total_m2)} m²` : sinRegistrar}</dd>
        </div>
      </Bloque>

      <Bloque
        eyebrow="Infraestructura técnica"
        titulo={galpon.nombre}
        faltan={[]}
        nota={faltantesGalpon(g).length > 0
          ? 'Las medidas e infraestructura las registra soporte técnico al instalar y calibrar los sensores.'
          : 'Datos técnicos registrados por soporte al instalar los sensores.'}
      >
        <div><dt>Código</dt><dd><code>{galpon.codigo}</code></dd></div>
        <div><dt>Capacidad</dt><dd>{g.capacidad_aves !== null ? `${enteroPuro.format(g.capacidad_aves)} aves` : sinRegistrar}</dd></div>
        <div><dt>Medidas</dt><dd>{g.ancho_metros !== null && g.largo_metros !== null ? `${entero.format(g.ancho_metros)} × ${entero.format(g.largo_metros)} m` : sinRegistrar}</dd></div>
        <div><dt>Techo</dt><dd>{g.tipo_techo ? capitalizar(g.tipo_techo) : sinRegistrar}</dd></div>
        <div><dt>Orientación</dt><dd>{g.orientacion ? capitalizar(g.orientacion.replace('-', ' – ')) : sinRegistrar}</dd></div>
        <div><dt>Construcción</dt><dd>{g.fecha_construccion ? formatearFechaCalendario(g.fecha_construccion) : sinRegistrar}</dd></div>
      </Bloque>

      {activos.map((lote) => (
        <Bloque
          key={lote.id}
          eyebrow={`Lote activo · Día ${diasDeVida(lote.fecha_ingreso)}`}
          titulo={lote.codigo}
          faltan={faltantesLote(lote)}
          onEditar={onEditarLote ? () => onEditarLote(lote) : undefined}
        >
          <div><dt>Ingreso</dt><dd>{formatearFechaCalendario(lote.fecha_ingreso)}</dd></div>
          <div><dt>Aves iniciales</dt><dd>{enteroPuro.format(lote.cantidad_inicial)} aves</dd></div>
          <div><dt>Línea genética</dt><dd>{lote.linea_genetica?.nombre ?? falta}</dd></div>
          <div><dt>Sexo</dt><dd>{lote.sexo ? capitalizar(lote.sexo) : falta}</dd></div>
          <div><dt>Marca de alimento</dt><dd>{lote.marca_alimento ? capitalizar(lote.marca_alimento) : falta}</dd></div>
        </Bloque>
      ))}
    </div>
  )
}

export default DatosPestana
