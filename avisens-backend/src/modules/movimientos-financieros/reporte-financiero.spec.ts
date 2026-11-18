import {
  armarReporte,
  LoteDelReporte,
  mesesSinMovimientos,
  MovimientoDelReporte,
} from './reporte-financiero';

const AHORA = new Date('2026-11-17T15:00:00.000Z');

const POLLITOS = { id: 2, nombre: 'Compra de pollitos', tipo: 'egreso' };
const ALIMENTO = { id: 3, nombre: 'Compra de alimento', tipo: 'egreso' };
const SANIDAD = { id: 4, nombre: 'Sanidad y vacunas', tipo: 'egreso' };
const VENTA = { id: 1, nombre: 'Venta de aves', tipo: 'ingreso' };

function movimiento(
  categoria: MovimientoDelReporte['categoria'],
  valor: number,
  fecha = '2026-10-01',
  loteId: number | null = 7,
): MovimientoDelReporte {
  return {
    lote_id: loteId,
    tipo: categoria.tipo,
    valor_cop: valor,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    categoria,
  };
}

const loteFinalizado: LoteDelReporte = {
  id: 7,
  codigo: 'L-007',
  granja: 'Granja Norte',
  estado: 'finalizado',
  fecha_ingreso: new Date('2026-09-01T00:00:00.000Z'),
  fecha_salida_real: new Date('2026-10-12T00:00:00.000Z'),
  cantidad_inicial: 1000,
  presupuesto_total_cop: 10_000_000,
  mortalidad: 50,
  peso_actual_g: 2450,
  peso_objetivo_g: 2500,
};

describe('armarReporte', () => {
  it('calcula balance, margen neto, costo por ave y presupuesto del lote', () => {
    const reporte = armarReporte(
      { tipo: 'lote', lote_id: 7 },
      [loteFinalizado],
      [
        movimiento(POLLITOS, 2_500_000),
        movimiento(ALIMENTO, 4_000_000),
        movimiento(SANIDAD, 1_000_000),
        movimiento(VENTA, 10_000_000),
      ],
      AHORA,
    );

    const [lote] = reporte.lotes;
    expect(lote.ingresos).toBe(10_000_000);
    expect(lote.egresos).toBe(7_500_000);
    expect(lote.balance).toBe(2_500_000);
    expect(lote.margen_neto_pct).toBe(25);
    // 950 aves vivas: 1000 iniciales menos 50 muertas.
    expect(lote.aves_vivas).toBe(950);
    expect(lote.costo_por_ave).toBeCloseTo(7894.74, 2);
    expect(lote.presupuesto_usado_pct).toBe(75);
    expect(lote.dia_vida).toBe(42);
    expect(lote.peso_actual_kg).toBe(2.45);
    expect(lote.egresos_por_categoria.map((c) => c.nombre)).toEqual([
      'Compra de alimento',
      'Compra de pollitos',
      'Sanidad y vacunas',
    ]);
    expect(reporte.totales.margen_neto_pct).toBe(25);
    expect(reporte.avisos).toEqual([]);
    expect(reporte.completo).toBe(true);
  });

  it('no inventa margen cuando no hay ingresos', () => {
    const reporte = armarReporte(
      { tipo: 'lote', lote_id: 7 },
      [{ ...loteFinalizado, estado: 'activo', fecha_salida_real: null }],
      [movimiento(POLLITOS, 2_000_000), movimiento(ALIMENTO, 1_000_000)],
      AHORA,
    );

    expect(reporte.lotes[0].margen_neto_pct).toBeNull();
    expect(reporte.lotes[0].balance).toBe(-3_000_000);
    // Un ciclo en curso solo informa; no marca el reporte como incompleto.
    expect(reporte.avisos.map((a) => a.codigo)).toEqual(['ciclo-en-curso']);
    expect(reporte.completo).toBe(true);
  });

  it('avisa cuando un lote cerrado no tiene venta ni costos esenciales', () => {
    const reporte = armarReporte(
      { tipo: 'lote', lote_id: 7 },
      [loteFinalizado],
      [movimiento(SANIDAD, 500_000)],
      AHORA,
    );

    const codigos = reporte.avisos.map((a) => a.codigo);
    expect(codigos).toEqual(['categoria-faltante', 'sin-venta']);
    expect(reporte.avisos[0].mensaje).toContain(
      'compra de pollitos ni de alimento',
    );
    expect(reporte.completo).toBe(false);
  });

  it('en un periodo no exige costos esenciales pero avisa los meses vacíos', () => {
    const reporte = armarReporte(
      {
        tipo: 'periodo',
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-10-31',
        granja_id: null,
      },
      [loteFinalizado],
      [
        movimiento(SANIDAD, 300_000, '2026-08-20'),
        movimiento(VENTA, 900_000, '2026-10-10'),
        movimiento({ id: 9, nombre: 'Arriendo', tipo: 'egreso' }, 200_000, '2026-10-02', null),
      ],
      AHORA,
    );

    expect(reporte.avisos.map((a) => a.codigo)).toEqual(['periodo-sin-datos']);
    expect(reporte.avisos[0].mensaje).toContain('septiembre de 2026');
    expect(reporte.gastos_generales.egresos).toBe(200_000);
    expect(reporte.totales.egresos).toBe(500_000);
    expect(reporte.completo).toBe(false);
  });

  it('deja fuera de los totales los movimientos sin tipo y lo avisa', () => {
    const reporte = armarReporte(
      { tipo: 'lote', lote_id: 7 },
      [loteFinalizado],
      [
        movimiento(POLLITOS, 1_000_000),
        movimiento(ALIMENTO, 1_000_000),
        movimiento(VENTA, 3_000_000),
        { ...movimiento(SANIDAD, 999), tipo: null },
      ],
      AHORA,
    );

    expect(reporte.totales.egresos).toBe(2_000_000);
    expect(reporte.avisos.map((a) => a.codigo)).toEqual(['sin-tipo']);
  });

  it('avisa cuando no hay ningún movimiento', () => {
    const reporte = armarReporte(
      { tipo: 'lote', lote_id: 7 },
      [{ ...loteFinalizado, estado: 'inactivo' }],
      [],
      AHORA,
    );

    expect(reporte.avisos[0].codigo).toBe('sin-movimientos');
    expect(reporte.lotes[0].costo_por_ave).toBe(0);
    expect(reporte.completo).toBe(false);
  });
});

describe('mesesSinMovimientos', () => {
  it('recorre los meses del rango, incluido el cambio de año', () => {
    const vacios = mesesSinMovimientos('2026-11-15', '2027-01-10', [
      movimiento(VENTA, 1, '2026-12-05'),
    ]);
    expect(vacios).toEqual(['noviembre de 2026', 'enero de 2027']);
  });
});
