import type { CSSProperties } from 'react'
import IconoFigma from '@shared/ui/icons/IconoFigma'
import type { Usuario } from '@shared/api'
import { hace } from '../model/adminResumen'

type RolClave = 'Administrador' | 'Propietario' | 'Operario'

type Props = {
  usuarios: Usuario[]
  total: number
  propietarios: number
  operarios: number
  administradores: number
  activos: number
  cargando: boolean
  onGestionar: (rol?: RolClave) => void
}

function iniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map((parte) => parte[0] ?? '').join('').toUpperCase()
}

function PanelActividadAdmin({ usuarios, total, propietarios, operarios, administradores, activos, cargando, onGestionar }: Props) {
  const roles = [
    { rol: 'Propietario' as const, etiqueta: 'Propietarios', cantidad: propietarios, descripcion: 'Titulares de granjas y finanzas' },
    { rol: 'Operario' as const, etiqueta: 'Operarios', cantidad: operarios, descripcion: 'Bitácora diaria en el galpón' },
    { rol: 'Administrador' as const, etiqueta: 'Administradores', cantidad: administradores, descripcion: 'Operan la plataforma' },
  ]

  return (
    <section className="cdc-panel cdc-entra" style={{ '--i': 9 } as CSSProperties} aria-labelledby="cdc-personas-titulo">
      <header className="cdc-panel-cabecera">
        <div>
          <h2 id="cdc-personas-titulo">Personas y roles</h2>
          <p>{cargando ? 'Cargando cuentas…' : `${activos} de ${total} cuentas con acceso activo`}</p>
        </div>
        <button type="button" className="cdc-enlace" onClick={() => onGestionar()}>
          Directorio <IconoFigma nombre="flecha-derecha" tamano={14} />
        </button>
      </header>

      <ul className="cdc-roles">
        {roles.map((item) => {
          const porcentaje = total > 0 ? Math.round((item.cantidad / total) * 100) : 0
          return (
            <li key={item.rol}>
              <button type="button" className={`cdc-rol cdc-rol--${item.rol.toLowerCase()}`} onClick={() => onGestionar(item.rol)}>
                <span className="cdc-rol-texto">
                  <strong>{item.etiqueta}</strong>
                  <small>{item.descripcion}</small>
                </span>
                <span className="cdc-rol-cifra">{cargando ? '–' : item.cantidad}</span>
                <span className="cdc-rol-barra" aria-hidden="true">
                  <span style={{ transform: `scaleX(${cargando ? 0 : porcentaje / 100})` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {usuarios.length > 0 && (
        <>
          <h3 className="cdc-subtitulo">Últimos registros</h3>
          <ul className="cdc-personas">
            {usuarios.slice(0, 3).map((usuario) => {
              const rol = usuario.rol.nombre as RolClave
              return (
                <li key={usuario.id}>
                  <button type="button" className="cdc-persona" onClick={() => onGestionar(rol)}>
                    <span className="cdc-persona-avatar" aria-hidden="true">{iniciales(usuario.nombre_completo)}</span>
                    <span className="cdc-persona-texto">
                      <strong>{usuario.nombre_completo}</strong>
                      <small>@{usuario.username}</small>
                    </span>
                    <span className={`cdc-insignia cdc-insignia--${rol.toLowerCase()}`}>{rol}</span>
                    <time dateTime={usuario.fecha_creacion}>{hace(usuario.fecha_creacion)}</time>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default PanelActividadAdmin
