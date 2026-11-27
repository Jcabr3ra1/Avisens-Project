import { PronosticoClimaService } from './pronostico-clima.service';

describe('PronosticoClimaService', () => {
  const service = new PronosticoClimaService();
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  const respuesta = (cuerpo: unknown, ok = true) =>
    ({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(cuerpo),
    }) as Response;

  const granja = (cambios: Record<string, unknown> = {}) => ({
    latitud: null,
    longitud: null,
    municipio: 'Rionegro',
    departamento: 'Antioquia',
    ...cambios,
  });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  describe('coordenadas', () => {
    it('usa las coordenadas de la granja sin geocodificar', async () => {
      const r = await service.coordenadas(
        granja({ latitud: 6.1, longitud: -75.3 }),
      );

      expect(r).toEqual({ latitud: 6.1, longitud: -75.3, origen: 'granja' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sin coordenadas elige el municipio del departamento correcto', async () => {
      fetchMock.mockResolvedValue(
        respuesta({
          results: [
            { latitude: 7.26, longitude: -73.15, admin1: 'Santander' },
            { latitude: 6.15, longitude: -75.37, admin1: 'Antioquia' },
          ],
        }),
      );

      const r = await service.coordenadas(
        granja({ departamento: 'antióquia' }),
      );

      expect(r).toEqual({
        latitud: 6.15,
        longitud: -75.37,
        origen: 'municipio',
      });
      expect(fetchMock.mock.calls[0][0]).toContain('name=Rionegro');
      expect(fetchMock.mock.calls[0][0]).toContain('countryCode=CO');
    });

    it('si el departamento no coincide toma el primer resultado', async () => {
      fetchMock.mockResolvedValue(
        respuesta({ results: [{ latitude: 1, longitude: 2, admin1: 'Otro' }] }),
      );

      const r = await service.coordenadas(granja());

      expect(r).toEqual({ latitud: 1, longitud: 2, origen: 'municipio' });
    });

    it('sin municipio ni coordenadas no hay ubicacion', async () => {
      expect(await service.coordenadas(granja({ municipio: null }))).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('si el municipio no existe devuelve null', async () => {
      fetchMock.mockResolvedValue(respuesta({}));

      expect(await service.coordenadas(granja())).toBeNull();
    });
  });

  describe('proximasHoras', () => {
    it('pide 72 horas en hora de Colombia y descarta horas incompletas', async () => {
      fetchMock.mockResolvedValue(
        respuesta({
          hourly: {
            time: ['2026-10-18T13:00', '2026-10-18T14:00', '2026-10-18T15:00'],
            temperature_2m: [30, null, 31.5],
            relative_humidity_2m: [60, 65, 70],
          },
        }),
      );

      const horas = await service.proximasHoras(6.15, -75.37);

      expect(horas).toEqual([
        { hora: '2026-10-18T13:00', temperatura: 30, humedad: 60 },
        { hora: '2026-10-18T15:00', temperatura: 31.5, humedad: 70 },
      ]);
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('forecast_hours=72');
      expect(url).toContain('timezone=America%2FBogota');
      expect(url).toContain('latitude=6.15&longitude=-75.37');
    });

    it('si Open-Meteo falla devuelve null', async () => {
      fetchMock.mockResolvedValue(respuesta({}, false));
      expect(await service.proximasHoras(1, 2)).toBeNull();

      fetchMock.mockRejectedValue(new Error('timeout'));
      expect(await service.proximasHoras(1, 2)).toBeNull();
    });

    it('sin horas completas devuelve null', async () => {
      fetchMock.mockResolvedValue(
        respuesta({
          hourly: {
            time: ['2026-10-18T13:00'],
            temperature_2m: [null],
            relative_humidity_2m: [60],
          },
        }),
      );

      expect(await service.proximasHoras(1, 2)).toBeNull();
    });
  });
});
