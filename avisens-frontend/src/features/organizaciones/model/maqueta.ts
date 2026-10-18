import type { GranjaOrganizacionDetalle } from '../api/organizaciones'

export const MAX_GRANJAS_MAQUETA = 16
export const MAX_GALPONES_POR_GRANJA = 12
export const COLUMNAS_GALPONES = 4

export const GALPON = {
  ancho: 0.9,
  largo: 2.4,
  pasoX: 1.25,
  pasoZ: 3.1,
} as const

const MARGEN_PARCELA = 0.7
const LADO_MINIMO_PARCELA = 2.6
const ESPACIO_ENTRE_PARCELAS = 1.4
const RADIO_SIN_GRANJAS = 3

export interface GalponMaqueta {
  id: number
  codigo: string
  nombre: string
  activo: boolean
  dispositivos: number
  sensores: number
  x: number
  z: number
}

export interface ParcelaMaqueta {
  id: number
  nombre: string
  activa: boolean
  x: number
  z: number
  ancho: number
  fondo: number
  galpones: GalponMaqueta[]
  galponesOcultos: number
  sensores: number
}

export interface Maqueta {
  parcelas: ParcelaMaqueta[]
  radio: number
  granjasOcultas: number
}

function medirParcela(granja: GranjaOrganizacionDetalle) {
  const visibles = granja.galpones.slice(0, MAX_GALPONES_POR_GRANJA)
  const columnas = Math.min(Math.max(visibles.length, 1), COLUMNAS_GALPONES)
  const filas = Math.max(Math.ceil(visibles.length / columnas), 1)
  const anchoInterior = (columnas - 1) * GALPON.pasoX + GALPON.ancho
  const fondoInterior = (filas - 1) * GALPON.pasoZ + GALPON.largo
  const galpones: GalponMaqueta[] = visibles.map((galpon, indice) => ({
    id: galpon.id,
    codigo: galpon.codigo,
    nombre: galpon.nombre,
    activo: galpon.activo,
    dispositivos: galpon._count.dispositivo,
    sensores: galpon._count.sensores,
    x: -anchoInterior / 2 + GALPON.ancho / 2 + (indice % columnas) * GALPON.pasoX,
    z: -fondoInterior / 2 + GALPON.largo / 2 + Math.floor(indice / columnas) * GALPON.pasoZ,
  }))
  return {
    granja,
    galpones,
    ancho: Math.max(anchoInterior + MARGEN_PARCELA * 2, LADO_MINIMO_PARCELA),
    fondo: Math.max(fondoInterior + MARGEN_PARCELA * 2, LADO_MINIMO_PARCELA),
  }
}

export function distribuirMaqueta(granjas: GranjaOrganizacionDetalle[]): Maqueta {
  const medidas = granjas.slice(0, MAX_GRANJAS_MAQUETA).map(medirParcela)
  const granjasOcultas = Math.max(granjas.length - MAX_GRANJAS_MAQUETA, 0)
  if (medidas.length === 0) return { parcelas: [], radio: RADIO_SIN_GRANJAS, granjasOcultas }

  const columnas = Math.ceil(Math.sqrt(medidas.length))
  const filas = Math.ceil(medidas.length / columnas)
  const anchoColumna = Array.from({ length: columnas }, () => 0)
  const fondoFila = Array.from({ length: filas }, () => 0)
  medidas.forEach((medida, indice) => {
    const columna = indice % columnas
    const fila = Math.floor(indice / columnas)
    anchoColumna[columna] = Math.max(anchoColumna[columna], medida.ancho)
    fondoFila[fila] = Math.max(fondoFila[fila], medida.fondo)
  })

  const anchoTotal = anchoColumna.reduce((suma, valor) => suma + valor, 0) + ESPACIO_ENTRE_PARCELAS * (columnas - 1)
  const fondoTotal = fondoFila.reduce((suma, valor) => suma + valor, 0) + ESPACIO_ENTRE_PARCELAS * (filas - 1)
  const inicioColumna = anchoColumna.map((_, columna) =>
    -anchoTotal / 2 + anchoColumna.slice(0, columna).reduce((suma, valor) => suma + valor + ESPACIO_ENTRE_PARCELAS, 0),
  )
  const inicioFila = fondoFila.map((_, fila) =>
    -fondoTotal / 2 + fondoFila.slice(0, fila).reduce((suma, valor) => suma + valor + ESPACIO_ENTRE_PARCELAS, 0),
  )

  const parcelas: ParcelaMaqueta[] = medidas.map((medida, indice) => {
    const columna = indice % columnas
    const fila = Math.floor(indice / columnas)
    return {
      id: medida.granja.id,
      nombre: medida.granja.nombre,
      activa: medida.granja.activa,
      x: inicioColumna[columna] + anchoColumna[columna] / 2,
      z: inicioFila[fila] + fondoFila[fila] / 2,
      ancho: medida.ancho,
      fondo: medida.fondo,
      galpones: medida.galpones,
      galponesOcultos: Math.max(medida.granja.galpones.length - MAX_GALPONES_POR_GRANJA, 0),
      sensores: medida.granja.galpones.reduce((suma, galpon) => suma + galpon._count.sensores, 0),
    }
  })

  const radio = parcelas.reduce(
    (maximo, parcela) => Math.max(maximo, Math.hypot(Math.abs(parcela.x) + parcela.ancho / 2, Math.abs(parcela.z) + parcela.fondo / 2)),
    0,
  )
  return { parcelas, radio, granjasOcultas }
}

export function aleatorioConSemilla(semilla: number): () => number {
  let estado = (semilla >>> 0) || 1
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let mezcla = estado
    mezcla = Math.imul(mezcla ^ (mezcla >>> 15), mezcla | 1)
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61)
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296
  }
}

export function describirMaqueta(nombre: string, granjas: GranjaOrganizacionDetalle[]): string {
  const galpones = granjas.flatMap(granja => granja.galpones)
  const conSensores = galpones.filter(galpon => galpon._count.sensores > 0).length
  const plural = (cantidad: number, singular: string, varios: string) => `${cantidad} ${cantidad === 1 ? singular : varios}`
  return `Maqueta 3D de ${nombre}: ${plural(granjas.length, 'granja', 'granjas')}, ${plural(galpones.length, 'galpón', 'galpones')} y ${plural(conSensores, 'galpón con sensores asignados', 'galpones con sensores asignados')}.`
}

export const MARGEN_SUELO = 4.6
const MARGEN_ARBOLES_BORDE = 0.4
const SEPARACION_PARCELA = 0.6
const HOLGURA_ENTRE_ARBOLES = 1.1

export interface ArbolMaqueta {
  x: number
  z: number
  escala: number
  giro: number
  variante: number
}

export function sembrarArboles(
  maqueta: Maqueta,
  azar: () => number,
  { variantes = 1, radioArbol = 0.32 }: { variantes?: number; radioArbol?: number } = {},
): ArbolMaqueta[] {
  const exterior = maqueta.radio + MARGEN_SUELO - MARGEN_ARBOLES_BORDE
  const objetivo = Math.min(45 + maqueta.parcelas.length * 10, 140)
  const colocados: ArbolMaqueta[] = []
  const pisaParcela = (x: number, z: number, margen: number) => maqueta.parcelas.some(parcela =>
    Math.abs(x - parcela.x) < parcela.ancho / 2 + margen && Math.abs(z - parcela.z) < parcela.fondo / 2 + margen)

  for (let intento = 0; intento < objetivo * 40 && colocados.length < objetivo; intento++) {
    const angulo = azar() * Math.PI * 2
    const distancia = Math.sqrt(azar()) * exterior
    const x = Math.cos(angulo) * distancia
    const z = Math.sin(angulo) * distancia
    const escala = 0.7 + azar() * 0.55
    const radio = radioArbol * escala
    if (distancia + radio > exterior) continue
    if (pisaParcela(x, z, radio + SEPARACION_PARCELA)) continue
    if (colocados.some(arbol => Math.hypot(arbol.x - x, arbol.z - z) < (arbol.escala * radioArbol + radio) * HOLGURA_ENTRE_ARBOLES)) continue
    colocados.push({ x, z, escala, giro: azar() * Math.PI * 2, variante: Math.floor(azar() * Math.max(variantes, 1)) })
  }
  return colocados
}

const MARGEN_PASTO_GALPON = 0.22

export interface MataPasto {
  x: number
  z: number
  escala: number
  giro: number
  variante: number
}

export function sembrarPasto(
  maqueta: Maqueta,
  azar: () => number,
  arboles: ArbolMaqueta[],
  { variantes = 1, radioTronco = 0.12 }: { variantes?: number; radioTronco?: number } = {},
): MataPasto[] {
  const exterior = maqueta.radio + MARGEN_SUELO - 0.2
  const objetivo = Math.min(160 + maqueta.parcelas.length * 30, 420)
  const matas: MataPasto[] = []
  for (let intento = 0; intento < objetivo * 6 && matas.length < objetivo; intento++) {
    const angulo = azar() * Math.PI * 2
    const distancia = Math.sqrt(azar()) * exterior
    const x = Math.cos(angulo) * distancia
    const z = Math.sin(angulo) * distancia
    const pisaGalpon = maqueta.parcelas.some(parcela => parcela.galpones.some(galpon =>
      Math.abs(x - parcela.x - galpon.x) < GALPON.ancho / 2 + MARGEN_PASTO_GALPON
      && Math.abs(z - parcela.z - galpon.z) < GALPON.largo / 2 + MARGEN_PASTO_GALPON))
    if (pisaGalpon) continue
    if (arboles.some(arbol => Math.hypot(arbol.x - x, arbol.z - z) < radioTronco * arbol.escala + 0.12)) continue
    matas.push({ x, z, escala: 0.7 + azar() * 0.6, giro: azar() * Math.PI * 2, variante: Math.floor(azar() * Math.max(variantes, 1)) })
  }
  return matas
}

export const MAX_GALLINAS = 60
const ANCHO_MODELO_GALPON = GALPON.ancho + 0.18
export const SEPARACION_GALLINAS = 0.24

export interface GallinaMaqueta {
  granjaId: number
  x: number
  z: number
  giro: number
  fase: number
}

export function ubicarGallinas(maqueta: Maqueta, azar: () => number, porGalpon = 4): GallinaMaqueta[] {
  const gallinas: GallinaMaqueta[] = []
  for (const parcela of maqueta.parcelas) {
    const propias: GallinaMaqueta[] = []
    for (const galpon of parcela.galpones.filter(item => item.activo)) {
      for (let cantidad = 0, intento = 0; cantidad < porGalpon && intento < 30 && gallinas.length + propias.length < MAX_GALLINAS; intento++) {
        const extremo = azar() < 0.5 ? -1 : 1
        const x = galpon.x + (azar() - 0.5) * ANCHO_MODELO_GALPON
        const z = galpon.z + extremo * (GALPON.largo / 2 + 0.16 + azar() * 0.22)
        const dentroDeGranja = Math.abs(x) < parcela.ancho / 2 - 0.08 && Math.abs(z) < parcela.fondo / 2 - 0.08
        const sobreGalpon = parcela.galpones.some(otro =>
          Math.abs(x - otro.x) < ANCHO_MODELO_GALPON / 2 + 0.06 && Math.abs(z - otro.z) < GALPON.largo / 2 + 0.08)
        const sobreGallina = propias.some(otra => Math.hypot(otra.x - x, otra.z - z) < SEPARACION_GALLINAS)
        if (!dentroDeGranja || sobreGalpon || sobreGallina) continue
        propias.push({ granjaId: parcela.id, x, z, giro: azar() * Math.PI * 2, fase: azar() })
        cantidad++
      }
    }
    gallinas.push(...propias)
  }
  return gallinas
}
