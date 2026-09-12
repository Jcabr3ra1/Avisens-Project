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
    granja: { create: jest.fn() },
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
    granja_nombre: 'Granja La Esperanza',
    granja_municipio: 'Tuluá',
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
    usuarios.altaDeUsuario.mockResolvedValue({
      id: 42,
      email: datos.email,
      organizacion_id: 8,
    });
    tx.granja.create.mockResolvedValue({ id: 9 });
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

  // Sin granja no hay galpones, sin galpones no hay lotes, y el cliente entra a
  // una cuenta donde no puede hacer nada. Antes la conversión creaba
  // organización y usuario y ahí se quedaba.
  it('crea la granja del cliente', async () => {
    await service.convertir(7, datos, solicitante);

    const datosGranja = (
      tx.granja.create.mock.calls as Array<[{ data: Record<string, unknown> }]>
    )[0][0].data;
    expect(datosGranja).toMatchObject({
      propietario_id: 42,
      organizacion_id: 8,
      nombre: 'Granja La Esperanza',
      municipio: 'Tuluá',
    });
  });

  // La llave foránea es compuesta: (propietario_id, organizacion_id) contra
  // Usuario(id, organizacion_id). Con la organización de otro, revienta.
  it('la granja usa la organización del usuario recién creado', async () => {
    usuarios.altaDeUsuario.mockResolvedValue({
      id: 55,
      email: datos.email,
      organizacion_id: 77,
    });

    await service.convertir(7, datos, solicitante);

    const datosGranja = (
      tx.granja.create.mock.calls as Array<[{ data: Record<string, unknown> }]>
    )[0][0].data;
    expect(datosGranja.propietario_id).toBe(55);
    expect(datosGranja.organizacion_id).toBe(77);
  });

  // El área que recogía el cuestionario era la de UN galpón, no la de la
  // granja. Y desde el recorte ya ni se pregunta.
  it('no le inventa un área a la granja', async () => {
    await service.convertir(7, datos, solicitante);

    const datosGranja = (
      tx.granja.create.mock.calls as Array<[{ data: Record<string, unknown> }]>
    )[0][0].data;
    expect(datosGranja).not.toHaveProperty('area_total_m2');
  });

  // Lo peor que puede pasar: un prospecto marcado «ganado» sin cliente
  // utilizable detrás, que además ya no se puede volver a convertir.
  it('si la granja falla, el prospecto no se cierra', async () => {
    tx.granja.create.mockRejectedValue(new Error('llave foránea'));

    await expect(service.convertir(7, datos, solicitante)).rejects.toThrow();
    expect(tx.prospecto.update).not.toHaveBeenCalled();
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
