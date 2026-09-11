import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProspectosService } from '../modules/prospectos/prospectos.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from '../modules/usuarios/usuarios.service';

/**
 * El CRM se acababa en «asignado»: `cerrado` existía en el enum y ninguna ruta
 * lo escribía, así que no había forma de saber cuántos de los que calificó el
 * bot acabaron siendo clientes.
 *
 * Lo importante de la conversión no es que cree el usuario, es que **o pasan
 * las tres cosas o no pasa ninguna**. Encadenar «crear usuario» y «cerrar
 * prospecto» desde el navegador deja un hueco: si la primera funciona y la
 * segunda falla, queda un cliente creado y un prospecto abierto, nadie sabe que
 * ya se convirtió, y alguien puede convertirlo otra vez.
 */
describe('convertir un prospecto en cliente', () => {
  let service: ProspectosService;

  const tx = {
    prospecto: { update: jest.fn() },
  };

  const prisma = {
    prospecto: { findUnique: jest.fn(), update: jest.fn() },
    usuario: { findUnique: jest.fn() },
    rol: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const usuarios = { altaDeUsuario: jest.fn() };

  const solicitante = { id: 1, rol: 'Administrador' };
  const calificado = { id: 7, estado: 'asignado', nombre: 'María López' };
  const datos = {
    nombre_completo: 'María López',
    cedula: '1098765432',
    email: 'maria@granja.com',
    password: 'Clave123Seg',
    telefono: '573001234567',
    organizacion_nombre: 'Avícola La Esperanza',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectosService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsuariosService, useValue: usuarios },
      ],
    }).compile();
    service = module.get<ProspectosService>(ProspectosService);

    prisma.prospecto.findUnique.mockResolvedValue(calificado);
    prisma.rol.findUnique.mockResolvedValue({ id: 2 });
    usuarios.altaDeUsuario.mockResolvedValue({ id: 42, email: datos.email });
    tx.prospecto.update.mockResolvedValue({
      id: 7,
      estado: 'cerrado',
      resultado_cierre: 'ganado',
    });
    prisma.$transaction.mockImplementation(
      (fn: (t: typeof tx) => unknown) => fn(tx),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('crea el cliente y cierra el prospecto en la misma transacción', async () => {
    const r = await service.convertir(7, datos, solicitante);

    // Las dos escrituras reciben el mismo `tx`: es lo que las hace atómicas.
    expect(usuarios.altaDeUsuario).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ cedula: '1098765432', rol_id: 2 }),
      solicitante,
      expect.any(String),
    );
    expect(tx.prospecto.update).toHaveBeenCalled();
    expect(r.usuario.id).toBe(42);
  });

  it('deja la traza de en qué cliente se convirtió', async () => {
    await service.convertir(7, datos, solicitante);

    const datosEscritos = (
      tx.prospecto.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0].data;
    expect(datosEscritos).toMatchObject({
      estado: 'cerrado',
      resultado_cierre: 'ganado',
      usuario_convertido_id: 42,
    });
  });

  it('siempre crea un Propietario, no lo elige quien llama', async () => {
    await service.convertir(7, datos, solicitante);

    expect(prisma.rol.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nombre: 'Propietario' } }),
    );
  });

  // El hash cuesta unos 100 ms: mantener la transacción abierta mientras tanto
  // sería tener bloqueada la fila del prospecto sin necesidad.
  it('cifra la contraseña antes de abrir la transacción', async () => {
    await service.convertir(7, datos, solicitante);

    const llamadas = usuarios.altaDeUsuario.mock.calls as Array<
      [unknown, unknown, unknown, string]
    >;
    const hash = llamadas[0][3];
    expect(hash).not.toBe(datos.password);
    expect(hash.length).toBeGreaterThan(20);
  });

  it('no convierte un prospecto ya cerrado', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      estado: 'cerrado',
    });

    await expect(service.convertir(7, datos, solicitante)).rejects.toThrow(
      BadRequestException,
    );
    expect(usuarios.altaDeUsuario).not.toHaveBeenCalled();
  });

  it('no convierte un prospecto que no existe', async () => {
    prisma.prospecto.findUnique.mockResolvedValue(null);

    await expect(service.convertir(7, datos, solicitante)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Lo que justifica la transacción: si el alta falla, el prospecto no se toca.
  it('si el alta del usuario falla, el prospecto no se cierra', async () => {
    usuarios.altaDeUsuario.mockRejectedValue(new Error('cédula repetida'));

    await expect(service.convertir(7, datos, solicitante)).rejects.toThrow();
    expect(tx.prospecto.update).not.toHaveBeenCalled();
  });
});

describe('cerrar un prospecto sin crear cliente', () => {
  let service: ProspectosService;

  const prisma = {
    prospecto: { findUnique: jest.fn(), update: jest.fn() },
    usuario: { findUnique: jest.fn() },
    rol: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const usuarios = { altaDeUsuario: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectosService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsuariosService, useValue: usuarios },
      ],
    }).compile();
    service = module.get<ProspectosService>(ProspectosService);
    prisma.prospecto.findUnique.mockResolvedValue({ id: 7, estado: 'asignado' });
    prisma.prospecto.update.mockResolvedValue({ id: 7, estado: 'cerrado' });
  });

  afterEach(() => jest.clearAllMocks());

  it('guarda el motivo de un perdido, que es lo que sirve para aprender', async () => {
    await service.cerrar(7, {
      resultado: 'perdido',
      motivo: 'El precio se salía de su presupuesto',
    });

    const datos = (
      prisma.prospecto.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0].data;
    expect(datos).toMatchObject({
      estado: 'cerrado',
      resultado_cierre: 'perdido',
      motivo_cierre: 'El precio se salía de su presupuesto',
    });
  });

  // Un prospecto ganado que no apunta a nadie es justo el agujero que esto
  // viene a cerrar: diría que se vendió sin poder decir a quién.
  it('un ganado sin cliente al que apuntar se rechaza', async () => {
    await expect(service.cerrar(7, { resultado: 'ganado' })).rejects.toThrow(
      /usuario_id|conversion/,
    );
    expect(prisma.prospecto.update).not.toHaveBeenCalled();
  });

  it('un ganado con un cliente que no existe se rechaza', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.cerrar(7, { resultado: 'ganado', usuario_id: 99 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('un ganado apuntando a un cliente que ya existía sí se cierra', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 12 });

    await service.cerrar(7, { resultado: 'ganado', usuario_id: 12 });

    const datos = (
      prisma.prospecto.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0].data;
    expect(datos.usuario_convertido_id).toBe(12);
  });

  it('no se cierra dos veces', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({ id: 7, estado: 'cerrado' });

    await expect(
      service.cerrar(7, { resultado: 'perdido' }),
    ).rejects.toThrow(BadRequestException);
  });
});
