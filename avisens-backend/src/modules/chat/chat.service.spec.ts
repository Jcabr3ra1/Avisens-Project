import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { iniciales } from './contactos';

describe('ChatService', () => {
  let service: ChatService;

  const prisma = { usuario: { findMany: jest.fn() } };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 4 };
  const operario = { id: 9, rol: 'Operario', organizacion_id: 4 };
  const huerfano = { id: 7, rol: 'Propietario' };

  const argsDe = (): Record<string, unknown> => {
    const calls = prisma.usuario.findMany.mock.calls as Array<
      [Record<string, unknown>]
    >;
    return calls[0][0];
  };
  const whereDe = (): Record<string, unknown> =>
    argsDe().where as Record<string, unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.usuario.findMany.mockResolvedValue([]);

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = modulo.get(ChatService);
  });

  describe('alcance', () => {
    it('el administrador cruza todas las organizaciones', async () => {
      await service.contactos(admin);

      expect(whereDe()).toEqual({ activo: true, id: { not: admin.id } });
      expect(whereDe().organizacion_id).toBeUndefined();
    });

    it('el propietario sólo ve la suya', async () => {
      await service.contactos(propietario);

      expect(whereDe()).toEqual({
        activo: true,
        id: { not: propietario.id },
        organizacion_id: 4,
      });
    });

    it('el operario también queda encerrado en la suya', async () => {
      await service.contactos(operario);

      expect(whereDe().organizacion_id).toBe(4);
    });

    it('sin organización y sin ser administrador no hay contactos', async () => {
      const resultado = await service.contactos(huerfano);

      expect(resultado).toEqual([]);
      // Lo importante no es el arreglo vacío sino que no llegue a consultar:
      // un where sin organizacion_id devolvería a todo el mundo.
      expect(prisma.usuario.findMany).not.toHaveBeenCalled();
    });

    it('organizacion_id en null tampoco abre la puerta', async () => {
      await service.contactos({ ...huerfano, organizacion_id: null });

      expect(prisma.usuario.findMany).not.toHaveBeenCalled();
    });

    it('nadie es contacto de sí mismo', async () => {
      await service.contactos(propietario);

      expect(whereDe().id).toEqual({ not: propietario.id });
    });

    it('los inactivos no aparecen', async () => {
      await service.contactos(admin);

      expect(whereDe().activo).toBe(true);
    });
  });

  describe('forma de la respuesta', () => {
    it('devuelve el rol plano y las iniciales ya calculadas', async () => {
      prisma.usuario.findMany.mockResolvedValue([
        {
          id: 3,
          nombre_completo: 'María José Pérez',
          organizacion_id: 4,
          rol: { nombre: 'Operario' },
        },
      ]);

      const [contacto] = await service.contactos(propietario);

      expect(contacto).toEqual({
        id: 3,
        nombre_completo: 'María José Pérez',
        rol: 'Operario',
        iniciales: 'MP',
        organizacion_id: 4,
      });
    });

    it('pide el listado en orden alfabético', async () => {
      await service.contactos(admin);

      expect(argsDe().orderBy).toEqual({ nombre_completo: 'asc' });
    });
  });

  describe('iniciales', () => {
    it('toma la primera y la última palabra, no las dos primeras', () => {
      expect(iniciales('María José Pérez')).toBe('MP');
    });

    it('con un solo nombre devuelve una letra', () => {
      expect(iniciales('Cher')).toBe('C');
    });

    it('aguanta espacios de sobra', () => {
      expect(iniciales('  Juan   Carlos  Jaller  ')).toBe('JJ');
    });

    it('con el nombre vacío no revienta', () => {
      expect(iniciales('   ')).toBe('');
    });
  });
});
