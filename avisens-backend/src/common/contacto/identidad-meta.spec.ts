import { esIdentidadMeta } from './identidad-meta';

describe('esIdentidadMeta', () => {
  it('reconoce la forma que manda Meta cuando no hay teléfono', () => {
    expect(esIdentidadMeta('CO.1639897497563370')).toBe(true);
    expect(esIdentidadMeta('MX.99')).toBe(true);
  });

  it('un teléfono de verdad no es una identidad', () => {
    expect(esIdentidadMeta('573001234567')).toBe(false);
    expect(esIdentidadMeta('+57 300 123 4567')).toBe(false);
  });

  it('no se confunde con cadenas parecidas', () => {
    expect(esIdentidadMeta('co.123')).toBe(false);
    expect(esIdentidadMeta('COL.123')).toBe(false);
    expect(esIdentidadMeta('CO.')).toBe(false);
    expect(esIdentidadMeta('CO.12a')).toBe(false);
  });

  it('aguanta la ausencia de dato', () => {
    expect(esIdentidadMeta(null)).toBe(false);
    expect(esIdentidadMeta(undefined)).toBe(false);
    expect(esIdentidadMeta('')).toBe(false);
  });
});
