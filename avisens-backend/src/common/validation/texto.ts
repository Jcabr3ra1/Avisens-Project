import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Letras (incluyendo tildes y ñ), espacios y separadores propios de nombres.
export const PATRON_NOMBRE_PERSONA =
  /^(?=.*\p{L})[\p{L}\s.'-]+$/u;

// Nombres de granjas, galpones, organizaciones, municipios, insumos, productos.
// Permite letras, números y puntuación comercial habitual; bloquea HTML, símbolos raros y emojis.
export const PATRON_NOMBRE_ENTIDAD =
  /^(?=.*\p{L})[\p{L}\p{N} .,'&()/#°%+-]+$/u;

// Texto descriptivo de una línea (causas, diagnósticos, motivos, direcciones, unidades).
export const PATRON_TEXTO_SEGURO =
  /^[\p{L}\p{N} .,;:¡!¿?()/#%°+'"&_–—-]+$/u;

// Texto descriptivo multilínea (observaciones, descripciones, mensajes PQRS).
export const PATRON_TEXTO_MULTILINEA =
  /^[\p{L}\p{N} \r\n.,;:¡!¿?()/#%°+'"&_–—-]+$/u;

// Códigos técnicos, seriales, números de factura, tópicos.
export const PATRON_CODIGO = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

// NIT colombiano (6 a 10 dígitos con dígito de verificación opcional).
export const PATRON_NIT = /^\d{6,10}(-\d)?$/;

// Cédula colombiana (6 a 10 dígitos).
export const PATRON_CEDULA = /^\d{6,10}$/;

// Teléfono colombiano (10 a 13 dígitos con prefijo + opcional).
export const PATRON_TELEFONO = /^\+?\d{10,13}$/;

// Teléfono amplio para formularios públicos (fijo 7 dígitos o móvil 10-13 con + opcional).
export const PATRON_TELEFONO_PUBLICO = /^\+?\d{7,13}$/;

// Versión semántica simple (ej. 1.2.3 o v1.2.3-beta).
export const PATRON_VERSION = /^v?\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[A-Za-z0-9.-]{1,20})?$/;

// Topes numéricos de dominio seguros para Decimal(p,s) en PostgreSQL.
export const AVES_MAXIMO_LOTE = 500_000;
export const DIMENSION_MAXIMA_M = 1_000;
export const AREA_MAXIMA_M2 = 5_000_000;
export const STOCK_MAXIMO = 10_000_000;
export const HORAS_MAXIMO = 100_000;
export const DIA_CICLO_MAXIMO = 365;
export const FCR_MAXIMO = 20;

export function limpiarTexto(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.trim() : valor;
}

export function limpiarTextoOpcional(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? undefined : limpio;
}

export function limpiarTelefono(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.replace(/[\s().-]/g, '') : valor;
}

export function limpiarDigitos(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.replace(/[\s.-]/g, '') : valor;
}

export function NombrePersona(max = 120) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => limpiarTexto(value)),
    IsString(),
    IsNotEmpty({ message: 'El nombre es obligatorio' }),
    MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
    MaxLength(max, { message: `El nombre no puede superar ${max} caracteres` }),
    Matches(PATRON_NOMBRE_PERSONA, {
      message: 'El nombre solo puede contener letras, espacios, puntos, guiones o apóstrofos',
    }),
  );
}

export function NombreEntidad(
  etiqueta = 'El campo',
  max = 120,
  requerido = true,
) {
  const base = [
    Transform(({ value }: { value: unknown }) =>
      requerido ? limpiarTexto(value) : limpiarTextoOpcional(value),
    ),
    IsString(),
    MaxLength(max, {
      message: `${etiqueta} no puede superar ${max} caracteres`,
    }),
    Matches(PATRON_NOMBRE_ENTIDAD, {
      message: `${etiqueta} debe contener letras y no admite símbolos especiales ni emojis`,
    }),
  ];
  if (requerido) {
    base.splice(2, 0, IsNotEmpty({ message: `${etiqueta} es obligatorio` }));
  }
  return applyDecorators(...base);
}

export function TextoSeguro(
  etiqueta = 'El texto',
  max = 500,
  opciones: { multilinea?: boolean; requerido?: boolean; exigirLetras?: boolean } = {},
) {
  const { multilinea = false, requerido = false, exigirLetras = false } = opciones;
  const patron = multilinea ? PATRON_TEXTO_MULTILINEA : PATRON_TEXTO_SEGURO;
  const decoradores = [
    Transform(({ value }: { value: unknown }) =>
      requerido ? limpiarTexto(value) : limpiarTextoOpcional(value),
    ),
    IsString(),
    MaxLength(max, {
      message: `${etiqueta} no puede superar ${max} caracteres`,
    }),
    Matches(patron, {
      message: `${etiqueta} contiene caracteres no permitidos`,
    }),
  ];
  if (requerido) {
    decoradores.splice(2, 0, IsNotEmpty({ message: `${etiqueta} es obligatorio` }));
  }
  if (exigirLetras) {
    decoradores.push(
      Matches(/\p{L}/u, {
        message: `${etiqueta} debe incluir letras descriptivas`,
      }),
    );
  }
  return applyDecorators(...decoradores);
}

export function CodigoAlfanumerico(
  etiqueta = 'El código',
  max = 60,
  requerido = true,
) {
  const decoradores = [
    Transform(({ value }: { value: unknown }) =>
      requerido ? limpiarTexto(value) : limpiarTextoOpcional(value),
    ),
    IsString(),
    MaxLength(max, {
      message: `${etiqueta} no puede superar ${max} caracteres`,
    }),
    Matches(PATRON_CODIGO, {
      message: `${etiqueta} solo admite letras sin tildes, números y los símbolos . _ - / :`,
    }),
  ];
  if (requerido) {
    decoradores.splice(2, 0, IsNotEmpty({ message: `${etiqueta} es obligatorio` }));
  }
  return applyDecorators(...decoradores);
}

export function NitColombiano() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/[.\s]/g, '') : value,
    ),
    IsString(),
    MaxLength(15, { message: 'El NIT no puede superar 15 caracteres' }),
    Matches(PATRON_NIT, {
      message: 'El NIT debe tener entre 6 y 10 dígitos (dígito de verificación opcional, ej.: 900123456-7)',
    }),
  );
}

export function CedulaColombiana() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => limpiarDigitos(value)),
    IsString(),
    Matches(PATRON_CEDULA, {
      message: 'La cédula debe tener entre 6 y 10 dígitos numéricos',
    }),
  );
}

export function TelefonoColombiano(publico = false) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => limpiarTelefono(value)),
    IsString(),
    Matches(publico ? PATRON_TELEFONO_PUBLICO : PATRON_TELEFONO, {
      message: publico
        ? 'El teléfono debe tener entre 7 y 13 dígitos numéricos'
        : 'El teléfono debe tener entre 10 y 13 dígitos numéricos',
    }),
  );
}

export function UrlHttpSegura(etiqueta = 'La URL', max = 500) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => limpiarTexto(value)),
    IsString(),
    MaxLength(max, {
      message: `${etiqueta} no puede superar ${max} caracteres`,
    }),
    IsUrl(
      { protocols: ['http', 'https'], require_protocol: true },
      { message: `${etiqueta} debe ser un enlace válido que inicie por http:// o https://` },
    ),
  );
}
