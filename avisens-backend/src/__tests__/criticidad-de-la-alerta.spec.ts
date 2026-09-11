import { Test, TestingModule } from '@nestjs/testing';
import { AlertasService } from '../modules/alertas/alertas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../modules/notificaciones/notificaciones.service';

/**
 * Lo grave que es una alerta lo declara quien configura el umbral, y el desvío
 * de la lectura sólo lo matiza.
 *
 * Antes salía sólo del desvío, con dos fallos que se tapaban entre ellos: la
 * criticidad del umbral se guardaba y nadie la miraba —un umbral marcado
 * «alta» producía alertas «media»— y el ancho con el que se medía el desvío
 * mezclaba la banda con el valor máximo, así que para 21-24 °C tomaba 24 en vez
 * de 3 y hacían falta 3,6 °C de desvío para que algo fuese grave.
 */
describe('la criticidad de la alerta sale del umbral', () => {
  let service: AlertasService;

  const prisma = {
    sensor: { findUnique: jest.fn() },
    umbralAmbiental: { findFirst: jest.fn() },
    alerta: { findFirst: jest.fn(), create: jest.fn() },
    usuarioGalpon: { findMany: jest.fn() },
    notificacion: { createMany: jest.fn() },
  };
  const notificaciones = { crear: jest.fn(), crearParaVarios: jest.fn() };

  const criticidadCreada = () =>
    (
      prisma.alerta.create.mock.calls as Array<
        [{ data: { criticidad: string } }]
      >
    )[0][0].data.criticidad;

  /** Una lectura sobre una banda y un umbral concretos. */
  const evaluar = async (
    valor: number,
    banda: [number, number],
    criticidad: string,
  ) => {
    prisma.sensor.findUnique.mockResolvedValue({
      id: 3,
      tipo: 'temperatura',
      galpon_id: 1,
      galpon: { nombre: 'Galpón Norte', granja: { propietario_id: 5 }, lotes: [] },
    });
    prisma.umbralAmbiental.findFirst.mockResolvedValue({
      valor_minimo: banda[0],
      valor_maximo: banda[1],
      criticidad,
    });
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 1, mensaje: 'x' });
    prisma.usuarioGalpon.findMany.mockResolvedValue([]);

    await service.evaluarLectura(3, valor);
    return criticidadCreada();
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacionesService, useValue: notificaciones },
      ],
    }).compile();
    service = module.get<AlertasService>(AlertasService);
  });

  afterEach(() => jest.clearAllMocks());

  // El caso real de producción: umbral de temperatura de la semana 5 marcado
  // «alta», banda 21-24, lectura de 26,4. Antes salía «media».
  it('respeta el «alta» que declaró quien puso el umbral', async () => {
    expect(await evaluar(26.4, [21, 24], 'alta')).toBe('alta');
  });

  it('rozar la banda baja un nivel', async () => {
    // 24,3 sobre 21-24: se pasa 0,3 y el 15 % de la banda son 0,45.
    expect(await evaluar(24.3, [21, 24], 'alta')).toBe('media');
  });

  it('un umbral «media» produce «baja» cuando apenas se roza', async () => {
    // 72 sobre 50-70: se pasa 2 y el 15 % de la banda son 3.
    expect(await evaluar(72, [50, 70], 'media')).toBe('baja');
  });

  it('y «media» cuando se aleja', async () => {
    expect(await evaluar(74, [50, 70], 'media')).toBe('media');
  });

  it('quedarse corto cuenta igual que pasarse', async () => {
    expect(await evaluar(17, [21, 24], 'alta')).toBe('alta');
    jest.clearAllMocks();
    expect(await evaluar(20.8, [21, 24], 'alta')).toBe('media');
  });

  // El suelo de la escala: un umbral «baja» no puede bajar más.
  it('un umbral «baja» se queda en «baja»', async () => {
    expect(await evaluar(70.5, [50, 70], 'baja')).toBe('baja');
    jest.clearAllMocks();
    expect(await evaluar(90, [50, 70], 'baja')).toBe('baja');
  });

  // El ancho es el de la banda, no el valor máximo. Con la fórmula vieja, el
  // corte para 21-24 quedaba en 3,6 °C y esta lectura salía «media».
  it('mide el desvío contra el ancho de la banda, no contra el máximo', async () => {
    expect(await evaluar(26, [21, 24], 'alta')).toBe('alta');
  });

  it('un umbral sin criticidad válida no rompe: cae al nivel intermedio', async () => {
    expect(await evaluar(40, [21, 24], 'critica')).toBe('media');
  });
});
