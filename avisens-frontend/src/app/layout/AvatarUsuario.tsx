import { useMemo, type CSSProperties } from 'react'
import { createAvatar } from '@dicebear/core'
import * as personas from '@dicebear/personas'

type GeneroAvatar = 'femenino' | 'masculino' | 'admin'

const NOMBRES_ADMIN = new Set([
  'admin', 'administrador', 'administradora', 'avisens', 'soporte', 'sistema', 'superadmin',
  'usuario', 'operario', 'propietario',
])

const NOMBRES_FEMENINOS = new Set([
  'maria', 'ana', 'carmen', 'laura', 'paula', 'daniela', 'camila', 'sofia', 'valentina',
  'isabella', 'mariana', 'lucia', 'gabriela', 'andrea', 'claudia', 'patricia', 'diana',
  'monica', 'gloria', 'marta', 'martha', 'sandra', 'natalia', 'adriana', 'carolina',
  'elena', 'victoria', 'rosa', 'luz', 'pilar', 'mercedes', 'raquel', 'beatriz', 'rocio',
  'ines', 'esther', 'angela', 'juliana', 'catalina', 'vanessa', 'jessica', 'karen',
  'tatiana', 'alejandra', 'lorena', 'marcela', 'clara', 'teresa', 'olga', 'esperanza',
  'amparo', 'blanca', 'estefania', 'valeria', 'salome', 'manuela', 'sarah', 'sara',
])

const NOMBRES_MASCULINOS = new Set([
  'juan', 'carlos', 'jose', 'luis', 'pedro', 'jorge', 'david', 'daniel', 'andres',
  'alejandro', 'manuel', 'miguel', 'jesus', 'francisco', 'antonio', 'fernando', 'javier',
  'ricardo', 'eduardo', 'roberto', 'diego', 'sergio', 'alberto', 'mario', 'hugo',
  'camilo', 'felipe', 'sebastian', 'mateo', 'nicolas', 'samuel', 'lucas', 'tomas',
  'santiago', 'cristian', 'esteban', 'julian', 'mauricio', 'gustavo', 'cesar', 'hector',
  'oscar', 'jaime', 'alvaro', 'rodrigo', 'fabian', 'edwin', 'alexander', 'victor',
  'enrique', 'pablo', 'gonzalo', 'raul', 'federico', 'ignacio', 'guillermo',
])

function detectarGenero(nombre?: string | null): GeneroAvatar {
  if (!nombre) return 'admin'
  const primerNombre = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)[0]

  if (!primerNombre) return 'admin'
  if (NOMBRES_ADMIN.has(primerNombre)) return 'admin'
  if (NOMBRES_FEMENINOS.has(primerNombre)) return 'femenino'
  if (NOMBRES_MASCULINOS.has(primerNombre)) return 'masculino'

  if (primerNombre.endsWith('a') && !['luca', 'elias', 'matias', 'borja', 'josue', 'noe'].includes(primerNombre)) {
    return 'femenino'
  }
  if (
    primerNombre.endsWith('o')
    || primerNombre.endsWith('e')
    || primerNombre.endsWith('r')
    || primerNombre.endsWith('l')
    || primerNombre.endsWith('s')
    || primerNombre.endsWith('n')
  ) {
    return 'masculino'
  }

  return 'admin'
}

interface Props {
  nombre?: string | null
  tamano?: number
  className?: string
  style?: CSSProperties
}

/**
 * Avatar de personaje utilizando la librería oficial @dicebear/personas.
 * Detecta género para perfilar peinados, accesorios y colores, con fallback para cuentas administrativas/institucionales.
 */
export default function AvatarUsuario({ nombre, tamano = 34, className = '', style }: Props) {
  const genero = detectarGenero(nombre)

  const dataUri = useMemo(() => {
    const opcionesBase = { seed: nombre?.trim() || 'Avisens', scale: 110 }

    if (genero === 'femenino') {
      return createAvatar(personas, {
        ...opcionesBase,
        hair: ['long', 'bobCut', 'pigtails', 'curlyBun', 'bobBangs', 'straightBun', 'extraLong'],
        facialHairProbability: 0,
        clothingColor: ['0f766e', '134e48', '0284c7', 'd97706', '7c3aed'],
      }).toDataUri()
    }

    if (genero === 'masculino') {
      return createAvatar(personas, {
        ...opcionesBase,
        hair: ['shortCombover', 'fade', 'buzzcut', 'shortComboverChops', 'curlyHighTop'],
        clothingColor: ['134e48', '1e3a5f', '1e293b', '15803d', '1b4332'],
      }).toDataUri()
    }

    // Default institucional / Administrador
    return createAvatar(personas, {
      ...opcionesBase,
      eyes: ['glasses', 'open'],
      hair: ['shortCombover', 'fade', 'cap'],
      clothingColor: ['1b4332', '134e48'],
    }).toDataUri()
  }, [nombre, genero])

  return (
    <img
      src={dataUri}
      alt={nombre ? `Avatar de ${nombre}` : 'Avatar de usuario'}
      width={tamano}
      height={tamano}
      className={className}
      style={{
        display: 'block',
        borderRadius: 'inherit',
        width: tamano,
        height: tamano,
        objectFit: 'cover',
        backgroundColor: 'var(--surface-subtle)',
        ...style,
      }}
    />
  )
}
