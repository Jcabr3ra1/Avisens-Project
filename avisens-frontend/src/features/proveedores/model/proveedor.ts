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
