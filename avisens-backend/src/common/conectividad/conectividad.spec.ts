import { estadoConexion, VENTANA_CONECTIVIDAD_MINUTOS } from './conectividad';

describe('estadoConexion', () => {
  const ahora = new Date('2026-10-17T12:00:00Z');
  const haceMinutos = (minutos: number) =>
    new Date(ahora.getTime() - minutos * 60_000);

  it('la ventana acordada es de 15 minutos', () => {
    expect(VENTANA_CONECTIVIDAD_MINUTOS).toBe(15);
  });

  it('dentro de la ventana, incluido el borde, está conectado', () => {
    expect(estadoConexion(haceMinutos(1), ahora)).toBe('conectado');
    expect(estadoConexion(haceMinutos(15), ahora)).toBe('conectado');
  });

  it('pasada la ventana queda sin reportar', () => {
    expect(estadoConexion(haceMinutos(16), ahora)).toBe('sin_reportar');
  });

  it('sin ninguna conexión registrada es «nunca»', () => {
    expect(estadoConexion(null, ahora)).toBe('nunca');
  });
});
