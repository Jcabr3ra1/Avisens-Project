import type { CrearGranjaPayload, Granja } from '../api/granjas'

export function crearFormularioGranja(): CrearGranjaPayload {
  return { nombre: '' }
}

export function formularioDesdeGranja(granja: Granja): CrearGranjaPayload {
  return {
    nombre: granja.nombre,
    direccion: granja.direccion ?? undefined,
    municipio: granja.municipio ?? undefined,
    departamento: granja.departamento ?? undefined,
    latitud: granja.latitud ?? undefined,
    longitud: granja.longitud ?? undefined,
    area_total_m2: granja.area_total_m2 ?? undefined,
    propietario_id: granja.propietario.id,
  }
}

export function limpiarPayloadGranja(form: CrearGranjaPayload): CrearGranjaPayload {
  return {
    nombre: form.nombre.trim(),
    direccion: form.direccion?.trim() || undefined,
    municipio: form.municipio?.trim() || undefined,
    departamento: form.departamento?.trim() || undefined,
    latitud: form.latitud,
    longitud: form.longitud,
    area_total_m2: form.area_total_m2,
    propietario_id: form.propietario_id,
  }
}
