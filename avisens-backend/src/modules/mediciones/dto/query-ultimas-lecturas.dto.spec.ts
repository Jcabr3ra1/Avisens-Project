import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { QueryUltimasLecturasDto } from './query-ultimas-lecturas.dto';

describe('QueryUltimasLecturasDto · galpon_id', () => {
  const construir = (galpon_id?: unknown) =>
    plainToInstance(QueryUltimasLecturasDto, { galpon_id });

  const tieneErrorEn = (galpon_id?: unknown) =>
    validateSync(construir(galpon_id)).some((e) => e.property === 'galpon_id');

  it('ausente: no hay error y el filtro queda undefined (todos los sensores del alcance)', () => {
    const dto = plainToInstance(QueryUltimasLecturasDto, {});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.galpon_id).toBeUndefined();
  });

  it('convierte una lista separada por coma en números', () => {
    expect(tieneErrorEn('3,7,11')).toBe(false);
    expect(construir('3,7,11').galpon_id).toEqual([3, 7, 11]);
  });

  it('convierte también cuando la clave llega repetida (arreglo de Express)', () => {
    expect(tieneErrorEn(['3', '7'])).toBe(false);
    expect(construir(['3', '7']).galpon_id).toEqual([3, 7]);
  });

  it('rechaza un valor vacío', () => {
    expect(tieneErrorEn('')).toBe(true);
  });

  it('rechaza un id mal formado', () => {
    expect(tieneErrorEn('1,abc')).toBe(true);
  });

  it('rechaza ids repetidos', () => {
    expect(tieneErrorEn('1,1,2')).toBe(true);
  });

  it('rechaza más de 100 ids', () => {
    const muchos = Array.from({ length: 101 }, (_, i) => i + 1).join(',');
    expect(tieneErrorEn(muchos)).toBe(true);
  });

  it('acepta exactamente 100 ids', () => {
    const cien = Array.from({ length: 100 }, (_, i) => i + 1).join(',');
    expect(tieneErrorEn(cien)).toBe(false);
  });

  it('rechaza cero y negativos', () => {
    expect(tieneErrorEn('0')).toBe(true);
    expect(tieneErrorEn('-1')).toBe(true);
  });
});
