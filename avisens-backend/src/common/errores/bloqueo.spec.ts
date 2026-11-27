import { esTimeoutDeBloqueo } from './bloqueo';

const driverCrudo = (originalCode: string) => {
  const e = new Error('canceling statement due to lock timeout');
  e.name = 'DriverAdapterError';
  (e as Error & { cause: unknown }).cause = { kind: 'postgres', originalCode };
  return e;
};

const consultaCruda = (originalCode: string) =>
  Object.assign(new Error('Raw query failed'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2010',
    meta: { driverAdapterError: { cause: { originalCode } } },
  });

describe('esTimeoutDeBloqueo', () => {
  it('reconoce el DriverAdapterError crudo con 55P03', () => {
    expect(esTimeoutDeBloqueo(driverCrudo('55P03'))).toBe(true);
  });

  it('reconoce el P2010 de consulta cruda con 55P03 anidado', () => {
    expect(esTimeoutDeBloqueo(consultaCruda('55P03'))).toBe(true);
  });

  it('un deadlock (40P01) no es un timeout de bloqueo', () => {
    expect(esTimeoutDeBloqueo(driverCrudo('40P01'))).toBe(false);
    expect(esTimeoutDeBloqueo(consultaCruda('40P01'))).toBe(false);
  });

  it('una violación de llave foránea o única no es un timeout de bloqueo', () => {
    expect(esTimeoutDeBloqueo(driverCrudo('23503'))).toBe(false);
    expect(esTimeoutDeBloqueo(driverCrudo('23505'))).toBe(false);
  });

  it('un P2028 (transacción vencida) no se traduce', () => {
    const e = Object.assign(new Error('Transaction API error'), {
      code: 'P2028',
      meta: { operation: 'commit', timeout: 700 },
    });
    expect(esTimeoutDeBloqueo(e)).toBe(false);
  });

  it('el texto "lock timeout" sin el código 55P03 no basta', () => {
    expect(
      esTimeoutDeBloqueo(new Error('canceling statement due to lock timeout')),
    ).toBe(false);
    const sinCodigo = new Error('lock timeout');
    sinCodigo.name = 'DriverAdapterError';
    expect(esTimeoutDeBloqueo(sinCodigo)).toBe(false);
  });

  it('el código 55P03 en una forma no reconocida no basta', () => {
    expect(esTimeoutDeBloqueo({ code: '55P03' })).toBe(false);
    expect(
      esTimeoutDeBloqueo({ code: 'P2010', cause: { originalCode: '55P03' } }),
    ).toBe(false);
  });

  it('valores no objeto o nulos', () => {
    expect(esTimeoutDeBloqueo(null)).toBe(false);
    expect(esTimeoutDeBloqueo(undefined)).toBe(false);
    expect(esTimeoutDeBloqueo('55P03')).toBe(false);
  });
});
