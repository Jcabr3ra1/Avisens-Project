export type FormularioProspectoWeb = {
  nombre: string
  telefono: string
  municipio: string
  tipo_produccion: string
  email: string
  consentimiento_habeas_data: boolean
}

export const formularioInicial: FormularioProspectoWeb = {
  nombre: '',
  telefono: '',
  municipio: '',
  tipo_produccion: '',
  email: '',
  consentimiento_habeas_data: false,
}
