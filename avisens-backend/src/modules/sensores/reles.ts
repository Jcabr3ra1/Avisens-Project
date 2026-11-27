// reles.ts — Identidad física de los relés K1-K4 del ESP32.
//
// Un relé se identifica por el ESP32 autenticado y su canal ("rele:k1" a
// "rele:k4"), igual que un DHT22 por su GPIO. El código del sensor queda
// como dato interno: el firmware ya no necesita conocerlo.
//
// Los registros antiguos (sin canal) se siguen reconociendo por su código
// "REL-K<n>-..." para no romper el firmware que todavía reporta por código.

export const CANALES_RELE = ['rele:k1', 'rele:k2', 'rele:k3', 'rele:k4'] as const;
export type CanalRele = (typeof CANALES_RELE)[number];

export const PATRON_CANAL_RELE = /^rele:k([1-4])$/;
// Contrato anterior: el firmware reportaba los relés por estos códigos.
export const PATRON_CODIGO_RELE_LEGADO = /^REL-K([1-4])-/i;

// Tipo que el firmware nuevo manda en las lecturas por canal. En la base, el
// `tipo` del relé es su nombre visible (editable): no forma parte de la
// identidad, así que renombrarlo no desconecta el relé.
export const TIPO_LECTURA_RELE = 'rele';

export const UNIDAD_RELE = 'estado';

// Nombre con el que se registra cada canal. Coincide con el cableado del
// firmware (GestorActuadores.h): K1 calefacción, K2 ventiladores, K3
// extractores, K4 bomba de agua.
export const NOMBRE_RELE: Record<CanalRele, string> = {
  'rele:k1': 'Bombillos de calefacción',
  'rele:k2': 'Ventiladores',
  'rele:k3': 'Extractores',
  'rele:k4': 'Bomba de agua',
};

export function esCanalRele(canal: string | null | undefined): canal is CanalRele {
  return typeof canal === 'string' && PATRON_CANAL_RELE.test(canal);
}

export function esUnidadEstado(unidad: string | null | undefined): boolean {
  return (unidad ?? '').trim().toLowerCase() === UNIDAD_RELE;
}

// Número del relé (1-4) para mensajes y códigos.
export function numeroRele(canal: CanalRele): number {
  return Number(PATRON_CANAL_RELE.exec(canal)![1]);
}

// Solo K1-K4 aceptan modo manual en el firmware. Con canal, manda el canal;
// sin canal (registro antiguo), el código. Un sensor con otro canal (un
// GPIO) nunca es un relé controlable, aunque su código lo parezca.
export function esReleControlable(sensor: {
  codigo: string;
  unidad_medida: string;
  canal?: string | null;
}): boolean {
  if (!esUnidadEstado(sensor.unidad_medida)) return false;
  if (sensor.canal != null) return esCanalRele(sensor.canal);
  return PATRON_CODIGO_RELE_LEGADO.test(sensor.codigo);
}
