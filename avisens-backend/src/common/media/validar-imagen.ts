import {
  BadRequestException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const MAX_BYTES_IMAGEN = 3 * 1024 * 1024;

export type MimeImagenPermitido = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImagenValidada {
  buffer: Uint8Array<ArrayBuffer>;
  mimeType: MimeImagenPermitido;
  tamano: number;
}

export function detectarMimeImagen(buf: Buffer): MimeImagenPermitido | null {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Valida una imagen binaria recibida por raw body comprobando tamaño y firma
 * mágica (JPEG, PNG o WebP), sin confiar en el header Content-Type.
 */
export function validarImagenBinaria(cuerpo: unknown): ImagenValidada {
  if (!Buffer.isBuffer(cuerpo) || cuerpo.length === 0) {
    throw new BadRequestException(
      'Envía una imagen JPG, PNG o WebP en el cuerpo de la petición.',
    );
  }
  if (cuerpo.length > MAX_BYTES_IMAGEN) {
    throw new PayloadTooLargeException(
      'La imagen supera el tamaño máximo permitido de 3 MB.',
    );
  }
  const mimeType = detectarMimeImagen(cuerpo);
  if (!mimeType) {
    throw new UnprocessableEntityException(
      'El archivo no corresponde a una imagen válida (JPG, PNG o WebP).',
    );
  }

  const copia = new Uint8Array(new ArrayBuffer(cuerpo.length));
  copia.set(cuerpo);
  return {
    buffer: copia,
    mimeType,
    tamano: cuerpo.length,
  };
}
