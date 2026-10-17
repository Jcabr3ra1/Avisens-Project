import { validarConexionSensor } from './conexion-sensor';

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
