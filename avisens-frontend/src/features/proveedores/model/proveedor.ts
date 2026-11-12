export interface Proveedor {
  id: number
  nombre: string
  nit: string
  tipo_proveedor: string | null
  contacto_persona: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  fecha_creacion: string
}

export interface FormularioProveedor {
  nombre: string
  nit: string
  tipo_proveedor: string
  contacto_persona: string
  telefono: string
  email: string
  direccion: string
}

export type CrearProveedorPayload = Omit<FormularioProveedor, 'tipo_proveedor' | 'contacto_persona' | 'telefono' | 'email' | 'direccion'> & {
  tipo_proveedor?: string
  contacto_persona?: string
  telefono?: string
  email?: string
  direccion?: string
}

export type ActualizarProveedorPayload = Partial<CrearProveedorPayload> & {
  activo?: boolean
}

export const FORMULARIO_PROVEEDOR_INICIAL: FormularioProveedor = {
  nombre: '',
  nit: '',
  tipo_proveedor: '',
  contacto_persona: '',
  telefono: '',
  email: '',
  direccion: '',
}

export function proveedorAFormulario(proveedor: Proveedor): FormularioProveedor {
  return {
    nombre: proveedor.nombre,
    nit: proveedor.nit,
    tipo_proveedor: proveedor.tipo_proveedor ?? '',
    contacto_persona: proveedor.contacto_persona ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
  }
}

// Indicador «Tipos» de la cabecera. Antes contaba solo los tipos con nombre y
// la nota decía «Clasificaciones distintas» aunque la tabla mostrara
// «Sin clasificar» (auditoría QA 2026-10-30, HALL-05). Ahora devuelve también
// cuántos proveedores no tienen tipo, para decirlo en la nota.
// «Alimento» y «alimento » cuentan como un solo tipo.
export function resumirTiposProveedor(proveedores: Pick<Proveedor, 'tipo_proveedor'>[]): {
  tipos: number
  sinClasificar: number
} {
  const tipos = new Set<string>()
  let sinClasificar = 0
  for (const { tipo_proveedor } of proveedores) {
    const tipo = tipo_proveedor?.trim().toLocaleLowerCase('es-CO') ?? ''
    if (tipo) tipos.add(tipo)
    else sinClasificar += 1
  }
  return { tipos: tipos.size, sinClasificar }
}

export function notaTiposProveedor(sinClasificar: number): string {
  if (sinClasificar === 0) return 'Clasificaciones distintas'
  return sinClasificar === 1 ? '1 sin clasificar' : `${sinClasificar} sin clasificar`
}
