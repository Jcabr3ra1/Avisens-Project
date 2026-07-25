// data.ts — Tipos y datos mock del módulo de Finanzas (EP-07 HU-30, HU-33).
// Registra ingresos y egresos del lote activo con categorización.
// Los montos están en pesos colombianos (COP).

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Dirección del flujo de dinero
export type TipoMovimiento = 'ingreso' | 'egreso'

// Categorías de ingresos y egresos del ciclo productivo
export type CategoriaFinanzas =
  | 'venta_aves'     // Ingreso por venta del lote al integrador
  | 'alimento'       // Egreso: compra de concentrado / alimento
  | 'vacunas'        // Egreso: medicamentos y vacunación
  | 'mano_obra'      // Egreso: pago a operarios
  | 'servicios'      // Egreso: agua, luz, gas
  | 'insumos'        // Egreso: cama, desinfectantes, combustible
  | 'otros'          // Otros ingresos o egresos no clasificados

// Un movimiento financiero del ciclo productivo
export type MovimientoFinanciero = {
  id: number
  tipo: TipoMovimiento
  categoria: CategoriaFinanzas
  descripcion: string
  monto: number        // Valor en COP (pesos colombianos)
  fecha: string        // DD/MM/YYYY
  lote: string         // Identificador del lote al que corresponde
  comprobante?: string // Nombre del archivo de comprobante (futuro)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Etiquetas legibles para las categorías financieras
export const ETIQUETAS_CATEGORIA: Record<CategoriaFinanzas, string> = {
  venta_aves:  'Venta de aves',
  alimento:    'Alimento / concentrado',
  vacunas:     'Vacunas y medicamentos',
  mano_obra:   'Mano de obra',
  servicios:   'Servicios (agua, luz)',
  insumos:     'Insumos y materiales',
  otros:       'Otros',
}

// ─── Datos mock ───────────────────────────────────────────────────────────────
// Lote activo: Lote 2026-A (GP-01, iniciado el 01/05/2026)

export const MOVIMIENTOS_MOCK: MovimientoFinanciero[] = [
  // ── Egresos del lote actual ──
  { id: 1,  tipo: 'egreso',   categoria: 'alimento',   descripcion: 'Concentrado iniciación Italcol 22kg',  monto: 4_800_000, fecha: '01/05/2026', lote: 'Lote-2026-A' },
  { id: 2,  tipo: 'egreso',   categoria: 'vacunas',    descripcion: 'Vacuna Newcastle + Gumboro',           monto: 320_000,   fecha: '03/05/2026', lote: 'Lote-2026-A' },
  { id: 3,  tipo: 'egreso',   categoria: 'insumos',    descripcion: 'Cama (viruta de madera 80 bultos)',    monto: 480_000,   fecha: '01/05/2026', lote: 'Lote-2026-A' },
  { id: 4,  tipo: 'egreso',   categoria: 'alimento',   descripcion: 'Concentrado engorde fase 1',           monto: 3_200_000, fecha: '12/05/2026', lote: 'Lote-2026-A' },
  { id: 5,  tipo: 'egreso',   categoria: 'mano_obra',  descripcion: 'Pago operario Edison — mayo',         monto: 1_300_000, fecha: '31/05/2026', lote: 'Lote-2026-A' },
  { id: 6,  tipo: 'egreso',   categoria: 'servicios',  descripcion: 'Factura energía eléctrica mayo',       monto: 285_000,   fecha: '05/06/2026', lote: 'Lote-2026-A' },
  { id: 7,  tipo: 'egreso',   categoria: 'alimento',   descripcion: 'Concentrado engorde fase 2',           monto: 5_400_000, fecha: '20/06/2026', lote: 'Lote-2026-A' },
  { id: 8,  tipo: 'egreso',   categoria: 'mano_obra',  descripcion: 'Pago operario Edison — junio',        monto: 1_300_000, fecha: '30/06/2026', lote: 'Lote-2026-A' },
  { id: 9,  tipo: 'egreso',   categoria: 'vacunas',    descripcion: 'Vitaminas C y E refuerzo calor',       monto: 95_000,    fecha: '25/06/2026', lote: 'Lote-2026-A' },
  { id: 10, tipo: 'egreso',   categoria: 'servicios',  descripcion: 'Factura agua junio',                   monto: 72_000,    fecha: '05/07/2026', lote: 'Lote-2026-A' },

  // ── Ingreso por lote anterior (ya cerrado) — referencia histórica ──
  { id: 11, tipo: 'ingreso',  categoria: 'venta_aves', descripcion: 'Venta lote 2025-C a Pimpollo S.A.',  monto: 38_400_000, fecha: '15/03/2026', lote: 'Lote-2025-C' },
]
