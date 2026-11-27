import type { ComponentPropsWithoutRef } from 'react'
import carpetasUrl from './figma/carpetas.svg?url'
import gruposUrl from './figma/grupos.svg?url'
import alarmaUrl from './figma/alarma.svg?url'
import servidorUrl from './figma/servidor.svg?url'
import actualizarUrl from './figma/actualizar.svg?url'
import archivoUrl from './figma/archivo.svg?url'
import buscarUrl from './figma/buscar.svg?url'
import graficoUrl from './figma/grafico.svg?url'
import verificadoUrl from './figma/verificado.svg?url'
import flechaDerechaUrl from './figma/flecha-derecha.svg?url'
import relojUrl from './figma/reloj.svg?url'
import arbolUrl from './figma/arbol.svg?url'
import fuegoUrl from './figma/fuego.svg?url'
import temperaturaUrl from './figma/temperatura.svg?url'
import './IconoFigma.css'

const iconosFigma = {
  carpetas: carpetasUrl,
  grupos: gruposUrl,
  alarma: alarmaUrl,
  servidor: servidorUrl,
  actualizar: actualizarUrl,
  archivo: archivoUrl,
  buscar: buscarUrl,
  grafico: graficoUrl,
  verificado: verificadoUrl,
  'flecha-derecha': flechaDerechaUrl,
  reloj: relojUrl,
  arbol: arbolUrl,
  fuego: fuegoUrl,
  temperatura: temperaturaUrl,
}

export type NombreIconoFigma = keyof typeof iconosFigma

type Props = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  nombre: NombreIconoFigma
  tamano?: number
}

/** Iconos exportados del pack de Figma; el color lo heredan del contexto AVISENS. */
function IconoFigma({ nombre, tamano = 18, className = '', style, ...atributos }: Props) {
  const url = iconosFigma[nombre]

  return (
    <span
      {...atributos}
      aria-hidden="true"
      className={`icono-figma ${className}`.trim()}
      style={{
        width: tamano,
        height: tamano,
        maskImage: `url("${url}")`,
        WebkitMaskImage: `url("${url}")`,
        ...style,
      }}
    />
  )
}

export default IconoFigma
