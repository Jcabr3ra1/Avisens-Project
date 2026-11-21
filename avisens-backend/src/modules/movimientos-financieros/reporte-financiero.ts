import { diaDeVida } from '../../common/fechas/dias-de-vida';

/**
 * Cálculo del reporte financiero por ciclo (HU-33), sin base de datos.
 *
 * El servicio trae las filas y aquí se hacen las cuentas: separado así se
 * puede probar cada regla (margen, costo por ave, avisos de datos
 * incompletos) con datos armados a mano.
 */

export interface MovimientoDelReporte {
  lote_id: number | null;
  tipo: string | null;
  valor_cop: number;
  fecha: Date;
  categoria: { id: number; nombre: string; tipo: string | null };
}

export interface LoteDelReporte {
  id: number;
  codigo: string;
  granja: string;
  estado: string;
  fecha_ingreso: Date;
  fecha_salida_real: Date | null;
  cantidad_inicial: number;
  presupuesto_total_cop: number | null;
  mortalidad: number;
  peso_actual_g: number | null;
  peso_objetivo_g: number | null;
}

export type AlcanceReporte =
  | { tipo: 'lote'; lote_id: number }
  | {
      tipo: 'periodo';
      fecha_desde: string;
      fecha_hasta: string;
      granja_id: number | null;
    };

export interface Balance {
  ingresos: number;
  egresos: number;
  balance: number;
  /** Balance sobre ingresos, en %. Null si no hubo ingresos: no hay base. */
  margen_neto_pct: number | null;
}

export interface TotalCategoria {
  categoria_id: number;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  total: number;
  movimientos: number;
}

export interface ResumenLote extends Balance {
  lote_id: number;
  codigo: string;
  granja: string;
  estado: string;
  dia_vida: number;
  cantidad_inicial: number;
  aves_vivas: number;
  /** Egresos entre aves vivas: lo que costó cada ave que queda o salió. */
  costo_por_ave: number | null;
  presupuesto_cop: number | null;
  presupuesto_usado_pct: number | null;
  peso_actual_kg: number | null;
  peso_objetivo_kg: number | null;
  egresos_por_categoria: TotalCategoria[];
}

export interface AvisoReporte {
  codigo:
    | 'sin-movimientos'
    | 'sin-tipo'
    | 'periodo-sin-datos'
    | 'categoria-faltante'
    | 'sin-venta'
    | 'ciclo-en-curso';
  mensaje: string;
}

export interface ReporteFinanciero {
  alcance: AlcanceReporte;
  generado_en: string;
  totales: Balance & { movimientos: number };
  lotes: ResumenLote[];
  /** Movimientos de granja sin lote (servicios, arriendo...). */
  gastos_generales: Balance & { movimientos: number };
  por_categoria: TotalCategoria[];
  avisos: AvisoReporte[];
  /** False si hay algún aviso que indique datos faltantes. */
  completo: boolean;
}

/**
 * Costos que todo ciclo de engorde tiene. Si un lote cerrado no registra
 * ninguno de estos egresos, el costo por ave sale artificialmente bajo y el
 * margen, inflado: eso es lo que la HU llama "datos incompletos".
 */
const COSTOS_ESENCIALES: { patron: RegExp; etiqueta: string }[] = [
  { patron: /pollit/i, etiqueta: 'compra de pollitos' },
  { patron: /aliment/i, etiqueta: 'alimento' },
];

const MEDIO_DIA_MS = 12 * 60 * 60 * 1000;

const AVISOS_INFORMATIVOS:AvisoReporte['codigo'][] = ['ciclo-en-curso'];

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function balanceDe(movimientos: MovimientoDelReporte[]): Balance & {
  movimientos: number;
} {
  let ingresos = 0;
  let egresos = 0;
  for (const movimiento of movimientos) {
    if (movimiento.tipo === 'ingreso') ingresos += movimiento.valor_cop;
    if (movimiento.tipo === 'egreso') egresos += movimiento.valor_cop;
  }
  const balance = ingresos - egresos;
  return {
    ingresos: redondear(ingresos),
    egresos: redondear(egresos),
    balance: redondear(balance),
    margen_neto_pct:
      ingresos > 0 ? redondear((balance / ingresos) * 100) : null,
    movimientos: movimientos.length,
  };
}

function totalesPorCategoria(
  movimientos: MovimientoDelReporte[],
): TotalCategoria[] {
  const porCategoria = new Map<string, TotalCategoria>();
  for (const movimiento of movimientos) {
    if (movimiento.tipo !== 'ingreso' && movimiento.tipo !== 'egreso') continue;
    const clave = `${movimiento.categoria.id}-${movimiento.tipo}`;
    const actual = porCategoria.get(clave) ?? {
      categoria_id: movimiento.categoria.id,
      nombre: movimiento.categoria.nombre,
      tipo: movimiento.tipo,
      total: 0,
      movimientos: 0,
    };
    actual.total = redondear(actual.total + movimiento.valor_cop);
    actual.movimientos += 1;
    porCategoria.set(clave, actual);
  }
  return [...porCategoria.values()].sort((a, b) =>
    a.tipo === b.tipo ? b.total - a.total : a.tipo === 'ingreso' ? -1 : 1,
  );
}

function resumirLote(
  lote: LoteDelReporte,
  movimientos: MovimientoDelReporte[],
  ahora: Date,
): ResumenLote {
  const balance = balanceDe(movimientos);
  const avesVivas = Math.max(lote.cantidad_inicial - lote.mortalidad, 0);
  const presupuesto =
    lote.presupuesto_total_cop !== null && lote.presupuesto_total_cop > 0
      ? lote.presupuesto_total_cop
      : null;
  return {
    lote_id: lote.id,
    codigo: lote.codigo,
    granja: lote.granja,
    estado: lote.estado,
    // fecha_salida_real es una fecha de calendario (medianoche UTC), no un
    // instante: diaDeVida la pasaría por la zona de Colombia y la correría un
    // día atrás. Se lleva al mediodía UTC, que cae en el mismo día allá.
    dia_vida: diaDeVida(
      lote.fecha_ingreso,
      lote.fecha_salida_real
        ? new Date(lote.fecha_salida_real.getTime() + MEDIO_DIA_MS)
        : ahora,
    ),
    cantidad_inicial: lote.cantidad_inicial,
    aves_vivas: avesVivas,
    costo_por_ave:
      avesVivas > 0 ? redondear(balance.egresos / avesVivas) : null,
    presupuesto_cop: presupuesto,
    presupuesto_usado_pct:
      presupuesto !== null
        ? redondear((balance.egresos / presupuesto) * 100)
        : null,
    peso_actual_kg:
      lote.peso_actual_g !== null
        ? redondear(lote.peso_actual_g / 1000)
        : null,
    peso_objetivo_kg:
      lote.peso_objetivo_g !== null
        ? redondear(lote.peso_objetivo_g / 1000)
        : null,
    ingresos: balance.ingresos,
    egresos: balance.egresos,
    balance: balance.balance,
    margen_neto_pct: balance.margen_neto_pct,
    egresos_por_categoria: totalesPorCategoria(movimientos).filter(
      (categoria) => categoria.tipo === 'egreso',
    ),
  };
}

const NOMBRE_MES = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Meses del periodo (AAAA-MM) en los que no hay ni un movimiento. */
export function mesesSinMovimientos(
  desde: string,
  hasta: string,
  movimientos: MovimientoDelReporte[],
): string[] {
  const conDatos = new Set(
    movimientos.map((movimiento) => movimiento.fecha.toISOString().slice(0, 7)),
  );
  const vacios: string[] = [];
  const cursor = new Date(`${desde.slice(0, 7)}-01T00:00:00.000Z`);
  const fin = new Date(`${hasta.slice(0, 7)}-01T00:00:00.000Z`);
  while (cursor <= fin) {
    const mes = cursor.toISOString().slice(0, 7);
    if (!conDatos.has(mes)) vacios.push(NOMBRE_MES.format(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return vacios;
}

function avisosDelLote(
  lote: LoteDelReporte,
  movimientos: MovimientoDelReporte[],
  cicloCompleto: boolean,
): AvisoReporte[] {
  const avisos: AvisoReporte[] = [];
  const egresos = movimientos.filter((m) => m.tipo === 'egreso');
  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso');

  // Solo se exige el costo base cuando se mira el ciclo entero: en un periodo
  // corto es normal que la compra de pollitos haya caído en otro mes.
  if (cicloCompleto) {
    const faltantes = COSTOS_ESENCIALES.filter(
      ({ patron }) => !egresos.some((m) => patron.test(m.categoria.nombre)),
    ).map(({ etiqueta }) => etiqueta);
    if (faltantes.length > 0) {
      avisos.push({
        codigo: 'categoria-faltante',
        mensaje: `El lote ${lote.codigo} no tiene egresos de ${faltantes.join(' ni de ')}: el costo por ave puede estar subestimado.`,
      });
    }
  }

  if (lote.estado === 'finalizado' && ingresos.length === 0) {
    avisos.push({
      codigo: 'sin-venta',
      mensaje: `El lote ${lote.codigo} está finalizado pero no tiene ingresos registrados: falta la venta de las aves y el margen no es real.`,
    });
  } else if (lote.estado === 'activo') {
    avisos.push({
      codigo: 'ciclo-en-curso',
      mensaje: `El lote ${lote.codigo} sigue en curso: las cifras son parciales hasta el cierre del ciclo.`,
    });
  }

  return avisos;
}

export function armarReporte(
  alcance: AlcanceReporte,
  lotes: LoteDelReporte[],
  movimientos: MovimientoDelReporte[],
  ahora: Date = new Date(),
): ReporteFinanciero {
  const avisos: AvisoReporte[] = [];

  const sinTipo = movimientos.filter(
    (m) => m.tipo !== 'ingreso' && m.tipo !== 'egreso',
  ).length;
  if (sinTipo > 0) {
    avisos.push({
      codigo: 'sin-tipo',
      mensaje: `${sinTipo} movimiento(s) no indican si son ingreso o egreso y quedaron fuera de los totales.`,
    });
  }

  if (movimientos.length === 0) {
    avisos.push({
      codigo: 'sin-movimientos',
      mensaje:
        alcance.tipo === 'lote'
          ? 'Este lote no tiene movimientos financieros registrados.'
          : 'No hay movimientos financieros registrados en el periodo seleccionado.',
    });
  } else if (alcance.tipo === 'periodo') {
    const vacios = mesesSinMovimientos(
      alcance.fecha_desde,
      alcance.fecha_hasta,
      movimientos,
    );
    if (vacios.length > 0) {
      avisos.push({
        codigo: 'periodo-sin-datos',
        mensaje: `Sin movimientos registrados en: ${vacios.join(', ')}.`,
      });
    }
  }

  const resumenes = lotes.map((lote) => {
    const delLote = movimientos.filter((m) => m.lote_id === lote.id);
    avisos.push(...avisosDelLote(lote, delLote, alcance.tipo === 'lote'));
    return resumirLote(lote, delLote, ahora);
  });

  const sinLote = movimientos.filter((m) => m.lote_id === null);

  return {
    alcance,
    generado_en: ahora.toISOString(),
    totales: balanceDe(movimientos),
    lotes: resumenes,
    gastos_generales: balanceDe(sinLote),
    por_categoria: totalesPorCategoria(movimientos),
    avisos,
    completo: avisos.every((aviso) =>
      AVISOS_INFORMATIVOS.includes(aviso.codigo),
    ),
  };
}
