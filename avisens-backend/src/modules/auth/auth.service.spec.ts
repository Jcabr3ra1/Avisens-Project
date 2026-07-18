import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Reemplazamos bcrypt entero por mocks: las pruebas no deben gastar tiempo
// hasheando de verdad, y así controlamos si compare() da true o false.
jest.mock('bcrypt');

// Construye un usuario de prueba; cada test sobreescribe lo que necesite.
function usuarioFalso(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: 'test@avisens.com',
    nombre_completo: 'Test',
    password_hash: 'hash-guardado',
    activo: true,
    rol: { nombre: 'Operario' },
    seguridad_cuenta: null,
    ...overrides,
  };
}

describe('AuthService.login', () => {
  let service: AuthService;
  // Mock de Prisma: solo los métodos que login() usa.
  const prisma = {
    usuario: { findUnique: jest.fn() },
    sesion: { create: jest.fn() },
    seguridadCuenta: { upsert: jest.fn() },
  };
  const jwt = { signAsync: jest.fn() };
  const config = { getOrThrow: jest.fn(), get: jest.fn() };

  beforeEach(async () => {
    // TestingModule: el mismo contenedor de inyección de Nest, pero con
    // nuestras dependencias falsas en vez de las reales.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Valores por defecto de los mocks para el camino feliz.
    jwt.signAsync.mockResolvedValue('un-token');
    config.getOrThrow.mockReturnValue('secreto');
    config.get.mockReturnValue('15m');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-refresh');
  });

  // Limpia el historial de llamadas entre pruebas para que no se contaminen.
  afterEach(() => jest.clearAllMocks());

  it('rechaza (401) si el usuario no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: 'x@x.com', password: '123456' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) si el usuario está inactivo', async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioFalso({ activo: false }));

    await expect(service.login({ email: 'test@avisens.com', password: '123456' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (403) si la cuenta está bloqueada', async () => {
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioFalso({ seguridad_cuenta: { id: 1, intentos_fallidos: 5, bloqueado_hasta: enUnaHora } }),
    );

    await expect(service.login({ email: 'test@avisens.com', password: '123456' }))
      .rejects.toThrow(ForbiddenException);
  });

  it('rechaza (401) y registra el intento si la contraseña es incorrecta', async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'test@avisens.com', password: 'mala' }))
      .rejects.toThrow(UnauthorizedException);

    // El efecto secundario importa: debe quedar registrado el fallo.
    expect(prisma.seguridadCuenta.upsert).toHaveBeenCalled();
  });

  it('con credenciales correctas devuelve tokens, crea sesión y resetea intentos', async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const resultado = await service.login({ email: 'test@avisens.com', password: 'buena' });

    expect(resultado.access_token).toBe('un-token');
    expect(resultado.refresh_token).toBe('un-token');
    expect(resultado.usuario).toEqual({
      id: 1,
      nombre: 'Test',
      email: 'test@avisens.com',
      rol: 'Operario',
    });
    expect(prisma.sesion.create).toHaveBeenCalled();
    expect(prisma.seguridadCuenta.upsert).toHaveBeenCalled(); // reseteo de intentos
  });
});
