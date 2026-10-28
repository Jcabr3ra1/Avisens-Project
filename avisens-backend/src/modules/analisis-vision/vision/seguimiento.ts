// Seguimiento de pollos entre fotos espaciadas de la ESP32-CAM.
//
// No es video: entre una foto y otra pasan segundos, así que un pollo que se
// movió mucho puede aparecer como uno nuevo. Para detectar quietud eso no
// importa: lo que interesa son los que NO se mueven. Cada detección se
// empareja con el pollo anterior que más se le solapa (IoU); si su centro se
// desplazó menos de una fracción de su tamaño, sigue "quieto" desde antes.

export interface Deteccion {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confianza: number;
  clase: string;
}

export type EstadoPollo = 'normal' | 'quieto' | 'posible_muerto';

export interface PolloSeguido extends Deteccion {
  id: number;
  quieto_desde: string; // ISO: última vez que se movió de verdad
  minutos_quieto: number;
  estado: EstadoPollo;
}

export interface ConfigSeguimiento {
  quietoMin: number; // minutos sin moverse para "quieto"
  muertoMin: number; // minutos sin moverse para "posible_muerto"
  olvidarSeg: number; // si la foto anterior es más vieja, se empieza de cero
  umbralIou?: number;
  movRelativo?: number; // desplazamiento / diagonal que cuenta como moverse
}

export interface EstadoAnterior {
  fecha: Date;
  pollos: PolloSeguido[];
  siguienteId: number;
}

export interface ResultadoSeguimiento {
  pollos: PolloSeguido[];
  siguienteId: number;
  quietos: number;
  posiblesMuertos: number;
}

type Caja = Pick<Deteccion, 'x1' | 'y1' | 'x2' | 'y2'>;

export function iou(a: Caja, b: Caja): number {
  const ancho = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const alto = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = ancho * alto;
  const union =
    (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union > 0 ? inter / union : 0;
}

function seMovio(antes: Caja, ahora: Caja, movRelativo: number): boolean {
  const dx = (ahora.x1 + ahora.x2 - antes.x1 - antes.x2) / 2;
  const dy = (ahora.y1 + ahora.y2 - antes.y1 - antes.y2) / 2;
  const diagonal = Math.hypot(antes.x2 - antes.x1, antes.y2 - antes.y1);
  return Math.hypot(dx, dy) > movRelativo * diagonal;
}

export function estadoPorMinutos(
  minutos: number,
  cfg: Pick<ConfigSeguimiento, 'quietoMin' | 'muertoMin'>,
): EstadoPollo {
  if (minutos >= cfg.muertoMin) return 'posible_muerto';
  if (minutos >= cfg.quietoMin) return 'quieto';
  return 'normal';
}

export function seguirPollos(
  anterior: EstadoAnterior | null,
  detecciones: Deteccion[],
  ahora: Date,
  cfg: ConfigSeguimiento,
): ResultadoSeguimiento {
  const umbralIou = cfg.umbralIou ?? 0.3;
  const movRelativo = cfg.movRelativo ?? 0.15;
  const vigente =
    anterior !== null &&
    (ahora.getTime() - anterior.fecha.getTime()) / 1000 <= cfg.olvidarSeg;
  const previos = vigente ? anterior.pollos : [];
  let siguienteId = anterior?.siguienteId ?? 1;
  const libres = new Set(previos.map((_, i) => i));

  // Las detecciones más seguras eligen primero: así una caja dudosa no le
  // roba el emparejamiento a una buena.
  const ordenadas = [...detecciones].sort((a, b) => b.confianza - a.confianza);

  const pollos = ordenadas.map((det): PolloSeguido => {
    let mejor = -1;
    let mejorIou = umbralIou;
    for (const i of libres) {
      const valor = iou(det, previos[i]);
      if (valor >= mejorIou) {
        mejor = i;
        mejorIou = valor;
      }
    }

    let id: number;
    let quietoDesde: Date;
    if (mejor === -1) {
      id = siguienteId++;
      quietoDesde = ahora;
    } else {
      libres.delete(mejor);
      const previo = previos[mejor];
      id = previo.id;
      quietoDesde = seMovio(previo, det, movRelativo)
        ? ahora
        : new Date(previo.quieto_desde);
    }

    const minutos = (ahora.getTime() - quietoDesde.getTime()) / 60000;
    return {
      ...det,
      id,
      quieto_desde: quietoDesde.toISOString(),
      minutos_quieto: Math.round(minutos * 10) / 10,
      estado: estadoPorMinutos(minutos, cfg),
    };
  });

  return {
    pollos,
    siguienteId,
    quietos: pollos.filter((p) => p.estado === 'quieto').length,
    posiblesMuertos: pollos.filter((p) => p.estado === 'posible_muerto').length,
  };
}
