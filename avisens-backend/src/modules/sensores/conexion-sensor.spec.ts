import {
  esConflictoConexion,
  validarConexionSensor,
} from './conexion-sensor';

describe('Conexión física DHT22', () => {
  it('acepta el GPIO 18 y conserva sensores anteriores sin conexión', () => {
    expect(() =>
      validarConexionSensor('gpio:18', 'temperatura', 'DHT22'),
    ).not.toThrow();
    expect(() => validarConexionSensor(null, 'co2', null)).not.toThrow();
  });
  it.each([
    ['gpio:34', 'temperatura', 'DHT22'],
    ['gpio:018', 'temperatura', 'DHT22'],
    ['gpio:18', 'co2', 'DHT22'],
    ['gpio:18', 'humedad', 'MQ135'],
  ])('rechaza GPIO o lector incompatible: %s %s %s', (canal, tipo, modelo) => {
    expect(() => validarConexionSensor(canal, tipo, modelo)).toThrow();
  });
});

describe('Conexión física de relés', () => {
  it('acepta rele:k1..k4 con unidad "estado", sin exigir DHT22 ni tipo fijo', () => {
    for (const canal of ['rele:k1', 'rele:k2', 'rele:k3', 'rele:k4']) {
      expect(() =>
        validarConexionSensor(canal, 'Bombillos de calefacción', 'Relé K1', 'estado'),
      ).not.toThrow();
    }
  });
  it.each([
    ['rele:k5', 'estado'],
    ['rele:k0', 'estado'],
    ['rele:K1', 'estado'],
    ['rele:k1', '°C'],
    ['rele:k1', undefined],
  ])('rechaza %s con unidad %s', (canal, unidad) => {
    expect(() =>
      validarConexionSensor(canal, 'Ventiladores', null, unidad),
    ).toThrow();
  });
});

describe('esConflictoConexion', () => {
  const p2002 = (meta?: unknown) =>
    Object.assign(new Error('Unique'), { code: 'P2002', meta });
  it('reconoce el choque de canal por columnas o por nombre de índice', () => {
    expect(esConflictoConexion(p2002({ target: ['dispositivo_id', 'tipo', 'canal'] }))).toBe(true);
    expect(esConflictoConexion(p2002({ target: 'sensores_rele_canal_unico' }))).toBe(true);
    expect(
      esConflictoConexion(
        p2002({ driverAdapterError: { cause: { constraint: { index: 'sensores_rele_canal_unico' } } } }),
      ),
    ).toBe(true);
  });
  it('no confunde el choque del código ni otros errores', () => {
    expect(esConflictoConexion(p2002({ target: ['codigo'] }))).toBe(false);
    expect(esConflictoConexion(p2002())).toBe(false);
    expect(esConflictoConexion(new Error('otro'))).toBe(false);
  });
});
