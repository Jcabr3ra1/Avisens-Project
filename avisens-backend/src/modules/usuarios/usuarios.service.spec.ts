import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mockeamos bcrypt: hashear con cost 12 es lento y no es lo que probamos aquí.
// Solo verificamos que la contraseña PASA por el hash, nunca en texto plano.
jest.mock('bcrypt');

describe('UsuariosService', () => {
  let service: UsuariosService;

  // Mock de Prisma: solo los métodos que toca el servicio.
  const prisma = {
    rol: { findUnique: jest.fn() },
    usuario: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sesion: { updateMany: jest.fn(), deleteMany: jest.fn() },
    seguridadCuenta: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const hashMock = bcrypt.hash as unknown as jest.Mock;

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    nombre_completo: 'María López',
    cedula: '1098765432',
    email: 'maria@granja.com',
    password: 'contraseña123',
    rol_id: 2,
  };

  // Lee el `data` con el que se llamó a un mock de escritura (create/update).
  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UsuariosService>(UsuariosService);

    // Defaults sanos: sin conflictos, transacción que devuelve página vacía.
    hashMock.mockResolvedValue('hash_fake');
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('un Propietario siempre crea Operarios, ignorando el rol_id que mande', async () => {
      prisma.rol.findUnique.mockResolvedValue({ id: 3 }); // el rol Operario
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      // Manda rol_id de Admin (1); debe quedar como Operario (3) de todos modos.
      await service.crear({ ...dtoCrear, rol_id: 1 }, propietario);

      expect(prisma.rol.findUnique).toHaveBeenCalledWith({
        where: { nombre: 'Operario' },
      });
      expect(dataDe(prisma.usuario.create).rol_id).toBe(3);
    });

    it('un Admin crea con el rol_id que indique', async () => {
      prisma.rol.findUnique.mockResolvedValue({ id: 2 });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear(dtoCrear, admin);

      expect(prisma.rol.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(dataDe(prisma.usuario.create).rol_id).toBe(2);
    });

    it('rechaza (404) si el rol indicado no existe', async () => {
      prisma.rol.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('hashea la contraseña (nunca la guarda en texto plano)', async () => {
      prisma.rol.findUnique.mockResolvedValue({ id: 2 });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear(dtoCrear, admin);

      expect(hashMock).toHaveBeenCalledWith('contraseña123', 12);
      const data = dataDe(prisma.usuario.create);
      expect(data.password_hash).toBe('hash_fake');
      expect(data).not.toHaveProperty('password');
    });
  });

  describe('listar', () => {
    it('un Propietario solo consulta Operarios', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rol: { nombre: 'Operario' } } }),
      );
    });

    it('un Admin consulta a todos (sin filtro de rol)', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.obtener(20, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver a un no-operario (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 2,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.obtener(2, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('un Propietario no puede cambiar el rol de su operario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 20,
        email: 'op@x.com',
        cedula: '123',
        rol: { nombre: 'Operario' },
      });
      prisma.usuario.update.mockResolvedValue({ id: 20 });

      await service.actualizar(20, { rol_id: 1 }, propietario);

      expect(dataDe(prisma.usuario.update).rol_id).toBeUndefined();
    });

    it('rechaza (409) si el email nuevo choca con otro usuario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 20,
        email: 'op@x.com',
        cedula: '123',
        rol: { nombre: 'Operario' },
      });
      prisma.usuario.findFirst.mockResolvedValue({ id: 99 }); // ya existe

      await expect(
        service.actualizar(20, { email: 'nuevo@x.com' }, admin),
      ).rejects.toThrow(ConflictException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });
  });

  describe('borrado', () => {
    it('no puedes desactivar tu propia cuenta (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.desactivar(1, admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('no puedes eliminarte a ti mismo de forma permanente (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.eliminarPermanente(1, admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
