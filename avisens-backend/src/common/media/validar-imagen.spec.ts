import {
  BadRequestException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  detectarMimeImagen,
  MAX_BYTES_IMAGEN,
  validarImagenBinaria,
} from './validar-imagen';

describe('validar-imagen', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const webp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  it('detecta JPEG, PNG y WebP por firma mágica', () => {
    expect(detectarMimeImagen(jpeg)).toBe('image/jpeg');
    expect(detectarMimeImagen(png)).toBe('image/png');
    expect(detectarMimeImagen(webp)).toBe('image/webp');
    expect(detectarMimeImagen(Buffer.from('texto plano'))).toBeNull();
  });

  it('valida una imagen correcta y devuelve su tamaño y tipo', () => {
    const resultado = validarImagenBinaria(png);
    expect(resultado.mimeType).toBe('image/png');
    expect(resultado.tamano).toBe(png.length);
    expect(resultado.buffer.byteLength).toBe(png.length);
  });

  it('rechaza cuerpo vacío o no binario', () => {
    expect(() => validarImagenBinaria(null)).toThrow(BadRequestException);
    expect(() => validarImagenBinaria(Buffer.alloc(0))).toThrow(
      BadRequestException,
    );
  });

  it('rechaza imágenes por encima del límite de 3 MB', () => {
    const grande = Buffer.alloc(MAX_BYTES_IMAGEN + 1);
    jpeg.copy(grande);
    expect(() => validarImagenBinaria(grande)).toThrow(
      PayloadTooLargeException,
    );
  });

  it('rechaza archivos con firma no permitida', () => {
    expect(() => validarImagenBinaria(Buffer.from('<svg></svg>'))).toThrow(
      UnprocessableEntityException,
    );
  });
});
