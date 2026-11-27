import { fechaLimite, horasDeCategoria, puedeTransitar } from './pqrs';

describe('dominio PQRS', () => {
  it('calcula el plazo por categoría', () => {
    expect(horasDeCategoria('Reclamo')).toBe(24);
    expect(horasDeCategoria('Queja')).toBe(48);
    expect(horasDeCategoria('Felicitación')).toBeNull();
    expect(horasDeCategoria('Desconocida')).toBe(48);
  });

  it('suma las horas a la fecha de radicación', () => {
    const desde = new Date('2026-10-16T10:00:00Z');
    expect(fechaLimite(desde, 24)?.toISOString()).toBe('2026-10-17T10:00:00.000Z');
    expect(fechaLimite(desde, null)).toBeNull();
  });

  it.each([
    ['abierta', 'en_proceso', true],
    ['abierta', 'resuelta', true],
    ['abierta', 'cerrada', false],
    ['en_proceso', 'resuelta', true],
    ['en_proceso', 'abierta', false],
    ['resuelta', 'cerrada', true],
    ['resuelta', 'en_proceso', true],
    ['cerrada', 'en_proceso', false],
    ['cerrada', 'cerrada', false],
    ['en_proceso', 'en_proceso', true],
  ])('%s → %s = %s', (desde, hacia, esperado) => {
    expect(puedeTransitar(desde, hacia)).toBe(esperado);
  });
});
