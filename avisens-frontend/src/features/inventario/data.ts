// data.ts — Tipos y datos mock del módulo de Inventario (EP-07 HU-31, HU-32).
// Controla el stock de insumos y el registro de proveedores.

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UnidadMedida = 'kg' | 'litros' | 'unidades' | 'dosis' | 'bultos'

// Estado del stock comparado con el umbral mínimo configurado
export type EstadoStock = 'ok' | 'bajo' | 'critico'

// Categorías de insumos del galpón
export type CategoriaInsumo = 'alimento' | 'vacuna' | 'limpieza' | 'medicamento' | 'otros'

// Un insumo en el inventario del galpón
export type InsumoInventario = {
  id: number
  nombre: string
  categoria: CategoriaInsumo
  stockActual: number
  stockMinimo: number   // Umbral de alerta (por debajo → estado 'bajo' o 'critico')
  unidad: UnidadMedida
  diasAutonomia: number // Días que dura el stock con el consumo actual
  proveedor: string
  estado: EstadoStock
  ultimaCompra: string  // DD/MM/YYYY
  precioUnitario: number // COP por unidad
}

// Calificación del desempeño de un proveedor (semáforo EP-07 HU-32)
export type CalificacionProveedor = 'verde' | 'amarillo' | 'rojo'

// Proveedor registrado en el sistema
export type Proveedor = {
  id: number
  nombre: string
  nit: string
  contacto: string
  telefono: string
  catalogo: string     // Descripción de los productos que provee
  calificacion: CalificacionProveedor
  puntajeCumplimiento: number  // 1-5
  puntajeCalidad: number       // 1-5
  puntajeEntrega: number       // 1-5
  ultimoPedido: string
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

export const INSUMOS_MOCK: InsumoInventario[] = [
  // Alimento concentrado — insumo principal
  {
    id: 1, nombre: 'Concentrado Engorde Fase 2', categoria: 'alimento',
    stockActual: 1200, stockMinimo: 500, unidad: 'kg', diasAutonomia: 18,
    proveedor: 'Italcol S.A.', estado: 'ok', ultimaCompra: '20/06/2026',
    precioUnitario: 1800,
  },
  // Vacuna con stock bajo
  {
    id: 2, nombre: 'Vacuna Newcastle (IB)', categoria: 'vacuna',
    stockActual: 40, stockMinimo: 100, unidad: 'dosis', diasAutonomia: 3,
    proveedor: 'MSD Animal Health', estado: 'critico', ultimaCompra: '01/05/2026',
    precioUnitario: 850,
  },
  // Desinfectante
  {
    id: 3, nombre: 'Glutaraldehído 20%', categoria: 'limpieza',
    stockActual: 18, stockMinimo: 10, unidad: 'litros', diasAutonomia: 25,
    proveedor: 'Proquimur', estado: 'ok', ultimaCompra: '15/06/2026',
    precioUnitario: 12000,
  },
  // Vitaminas — stock bajo
  {
    id: 4, nombre: 'Vitamina C + E (electrolitos)', categoria: 'medicamento',
    stockActual: 2, stockMinimo: 5, unidad: 'kg', diasAutonomia: 4,
    proveedor: 'Agrove', estado: 'bajo', ultimaCompra: '25/06/2026',
    precioUnitario: 45000,
  },
  // Cal viva para limpieza de cama
  {
    id: 5, nombre: 'Cal viva', categoria: 'limpieza',
    stockActual: 12, stockMinimo: 5, unidad: 'bultos', diasAutonomia: 30,
    proveedor: 'Ferretería Agroinsumos Cauca', estado: 'ok', ultimaCompra: '01/05/2026',
    precioUnitario: 18000,
  },
  // Gas propano para calefacción
  {
    id: 6, nombre: 'Gas propano', categoria: 'otros',
    stockActual: 30, stockMinimo: 15, unidad: 'kg', diasAutonomia: 12,
    proveedor: 'Gas Natural del Sur', estado: 'ok', ultimaCompra: '18/06/2026',
    precioUnitario: 4200,
  },
]

export const PROVEEDORES_MOCK: Proveedor[] = [
  {
    id: 1, nombre: 'Italcol S.A.', nit: '860.002.626-5',
    contacto: 'Jorge Medina', telefono: '311-450-2030',
    catalogo: 'Concentrados y alimentos para aves de engorde',
    calificacion: 'verde', puntajeCumplimiento: 5, puntajeCalidad: 5, puntajeEntrega: 4,
    ultimoPedido: '20/06/2026',
  },
  {
    id: 2, nombre: 'MSD Animal Health', nit: '900.123.456-1',
    contacto: 'Claudia Torres', telefono: '320-300-4050',
    catalogo: 'Vacunas y biológicos para avicultura',
    calificacion: 'amarillo', puntajeCumplimiento: 3, puntajeCalidad: 5, puntajeEntrega: 3,
    ultimoPedido: '01/05/2026',
  },
  {
    id: 3, nombre: 'Proquimur', nit: '900.456.789-3',
    contacto: 'Rafael Muñoz', telefono: '314-600-1122',
    catalogo: 'Desinfectantes, bioseguridad y limpieza para granjas',
    calificacion: 'verde', puntajeCumplimiento: 4, puntajeCalidad: 4, puntajeEntrega: 5,
    ultimoPedido: '15/06/2026',
  },
  {
    id: 4, nombre: 'Agrove', nit: '900.321.654-7',
    contacto: 'Adriana Leal', telefono: '316-780-9900',
    catalogo: 'Vitaminas, electrolitos y aditivos para aves',
    calificacion: 'verde', puntajeCumplimiento: 5, puntajeCalidad: 5, puntajeEntrega: 5,
    ultimoPedido: '25/06/2026',
  },
]
