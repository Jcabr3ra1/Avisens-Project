import { ForbiddenException } from '@nestjs/common';
import {
  filtroGalpones,
  filtroGranjas,
  filtroLotes,
  verificarAccesoGalpon,
} from './alcance';

describe('alcance por rol', () => {
  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 10 };
  const operario = { id: 8, rol: 'Operario', organizacion_id: 10 };

  it('no limita al administrador', () => {
    expect(filtroGranjas(admin)).toBeUndefined();
    expect(filtroGalpones(admin)).toBeUndefined();
    expect(filtroLotes(admin)).toBeUndefined();
  });

  it('limita al propietario por dueño', () => {
    expect(filtroGranjas(propietario)).toEqual({ propietario_id: 5 });
    expect(filtroGalpones(propietario)).toEqual({
      granja: { propietario_id: 5 },
    });
  });

  it('limita al operario por asignación activa y galpón activo', () => {
    expect(filtroGranjas(operario)).toEqual({
      activa: true,
      organizacion: { activa: true },
      galpones: {
        some: {
          activo: true,
          usuarios_galpones: {
            some: { usuario_id: 8, activa: true },
          },
        },
      },
    });
    expect(filtroGalpones(operario)).toEqual({
      activo: true,
      granja: { activa: true, organizacion: { activa: true } },
      usuarios_galpones: {
        some: { usuario_id: 8, activa: true },
      },
    });
    expect(filtroLotes(operario)).toEqual({
      galpon: {
        activo: true,
        granja: { activa: true, organizacion: { activa: true } },
        usuarios_galpones: {
          some: { usuario_id: 8, activa: true },
        },
      },
    });
  });

  it('rechaza un galpón fuera del alcance', async () => {
    const prisma = {
      galpon: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never;

    await expect(
      verificarAccesoGalpon(prisma, 20, operario),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acepta una asignación activa', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 20 });
    const prisma = {
      galpon: { findFirst },
    } as never;

    await expect(
      verificarAccesoGalpon(prisma, 20, operario),
    ).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 20,
        activo: true,
        granja: { activa: true, organizacion: { activa: true } },
        usuarios_galpones: {
          some: { usuario_id: 8, activa: true },
        },
      },
      select: { id: true },
    });
  });
});
