import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  })),
}));

import { NotFoundException } from '@nestjs/common';
import { CopilotoService } from './copiloto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LotesService } from '../lotes/lotes.service';
import { IndicadoresService } from '../indicadores/indicadores.service';
import { PrediccionesService } from '../predicciones/predicciones.service';
import { RecomendacionesService } from '../recomendaciones/recomendaciones.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

type RespuestaClaude = {
  stop_reason: string;
  content: unknown[];
  usage: { output_tokens: number };
};

describe('CopilotoService', () => {
  let service: CopilotoService;
  let crear: jest.Mock;

  const prisma = {
    conversacionIa: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mensajeIa: { findMany: jest.fn(), createMany: jest.fn() },
  };
  const lotesService = { listar: jest.fn() };
  const indicadoresService = { listar: jest.fn(), compararConCurva: jest.fn() };
  const prediccionesService = { predecir: jest.fn() };
  const recomendacionesService = { listar: jest.fn() };

  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const soloTexto = (texto: string): RespuestaClaude => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: texto }],
    usage: { output_tokens: 12 },
  });

  const pideHerramienta = (
    name: string,
    input: Record<string, unknown>,
  ): RespuestaClaude => ({
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'tu_1', name, input }],
    usage: { output_tokens: 8 },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotoService,
        { provide: PrismaService, useValue: prisma },
        { provide: LotesService, useValue: lotesService },
        { provide: IndicadoresService, useValue: indicadoresService },
        { provide: PrediccionesService, useValue: prediccionesService },
        { provide: RecomendacionesService, useValue: recomendacionesService },
      ],
    }).compile();

    service = module.get<CopilotoService>(CopilotoService);

    prisma.conversacionIa.create.mockResolvedValue({ id: 1 });
    prisma.conversacionIa.update.mockResolvedValue({ id: 1 });
    prisma.mensajeIa.findMany.mockResolvedValue([]);
    prisma.mensajeIa.createMany.mockResolvedValue({ count: 2 });

    crear = jest.fn();
    (
      service as unknown as { claude: { messages: { create: jest.Mock } } }
    ).claude = { messages: { create: crear } };
  });

  it('responde sin herramientas cuando Claude no las pide', async () => {
    crear.mockResolvedValue(soloTexto('Hola, soy AVIA'));

    const r = await service.preguntar({ pregunta: 'hola' }, propietario);

    expect(r).toEqual({
      conversacion_id: 1,
      respuesta: 'Hola, soy AVIA',
      herramientas_usadas: 0,
    });
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it('ejecuta la herramienta que pide Claude y le devuelve el resultado', async () => {
    indicadoresService.listar.mockResolvedValue([{ fcr: 1.24 }]);
    indicadoresService.compararConCurva.mockResolvedValue({
      veredicto: 'en_objetivo',
    });
    crear
      .mockResolvedValueOnce(
        pideHerramienta('consultar_indicadores', { lote_id: 1 }),
      )
      .mockResolvedValueOnce(soloTexto('Tu lote va en objetivo'));

    const r = await service.preguntar(
      { pregunta: 'como va el lote 1' },
      propietario,
    );

    expect(r.herramientas_usadas).toBe(1);
    expect(r.respuesta).toBe('Tu lote va en objetivo');
    expect(indicadoresService.listar).toHaveBeenCalledWith(1, propietario);
    expect(indicadoresService.compararConCurva).toHaveBeenCalledWith(
      1,
      propietario,
    );
  });

  it('pasa el solicitante a la herramienta para respetar el alcance por rol', async () => {
    lotesService.listar.mockResolvedValue({ data: [] });
    crear
      .mockResolvedValueOnce(pideHerramienta('listar_lotes', {}))
      .mockResolvedValueOnce(soloTexto('No tienes lotes'));

    await service.preguntar({ pregunta: 'mis lotes' }, propietario);

    expect(lotesService.listar).toHaveBeenCalledWith(propietario, {
      page: 1,
      limit: 20,
    });
  });

  it('convierte el error de una herramienta en resultado, sin tumbar la peticion', async () => {
    prediccionesService.predecir.mockRejectedValue(
      new Error('Solo puedes predecir tus propios lotes'),
    );
    crear
      .mockResolvedValueOnce(
        pideHerramienta('consultar_prediccion', { lote_id: 99 }),
      )
      .mockResolvedValueOnce(soloTexto('No tienes acceso a ese lote'));

    const r = await service.preguntar({ pregunta: 'lote 99' }, propietario);

    expect(r.respuesta).toBe('No tienes acceso a ese lote');
    const llamadas = crear.mock.calls as Array<
      [{ messages: Array<{ content: unknown }> }]
    >;
    const segundaLlamada = llamadas[1][0];
    const ultimo = segundaLlamada.messages.at(-1) as {
      content: Array<{ content: string }>;
    };
    expect(ultimo.content[0].content).toContain(
      'Solo puedes predecir tus propios lotes',
    );
  });

  it('corta el bucle en MAX_VUELTAS aunque Claude siga pidiendo herramientas', async () => {
    lotesService.listar.mockResolvedValue({ data: [] });
    crear.mockResolvedValue(pideHerramienta('listar_lotes', {}));

    const r = await service.preguntar({ pregunta: 'bucle' }, propietario);

    expect(r.herramientas_usadas).toBe(5);
    expect(crear).toHaveBeenCalledTimes(6);
  });

  it('no deja continuar una conversacion de otro usuario', async () => {
    prisma.conversacionIa.findFirst.mockResolvedValue(null);

    await expect(
      service.preguntar({ pregunta: 'hola', conversacion_id: 7 }, propietario),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.conversacionIa.findFirst).toHaveBeenCalledWith({
      where: { id: 7, usuario_id: 5 },
    });
  });

  it('manda el historial en orden cronologico', async () => {
    prisma.conversacionIa.findFirst.mockResolvedValue({ id: 3 });
    prisma.mensajeIa.findMany.mockResolvedValue([
      { rol: 'assistant', contenido: 'segundo' },
      { rol: 'user', contenido: 'primero' },
    ]);
    crear.mockResolvedValue(soloTexto('ok'));

    await service.preguntar(
      { pregunta: 'tercero', conversacion_id: 3 },
      propietario,
    );

    const llamadas = crear.mock.calls as Array<
      [{ messages: Array<{ role: string; content: unknown }> }]
    >;
    const llamada = llamadas[0][0];
    expect(llamada.messages).toEqual([
      { role: 'user', content: 'primero' },
      { role: 'assistant', content: 'segundo' },
      { role: 'user', content: 'tercero' },
    ]);
  });

  it('guarda la pregunta y la respuesta en la conversacion', async () => {
    crear.mockResolvedValue(soloTexto('respuesta final'));

    await service.preguntar({ pregunta: 'una pregunta' }, propietario);

    expect(prisma.mensajeIa.createMany).toHaveBeenCalledWith({
      data: [
        { conversacion_id: 1, rol: 'user', contenido: 'una pregunta' },
        {
          conversacion_id: 1,
          rol: 'assistant',
          contenido: 'respuesta final',
          tokens: 12,
        },
      ],
    });
  });
});
