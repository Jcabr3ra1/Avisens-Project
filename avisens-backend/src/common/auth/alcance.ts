import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from './roles';
import type { Solicitante } from './acceso';

const SIN_ASIGNACION =
  'No tienes una asignación activa para acceder a este recurso';

export function esAdministrador(solicitante: Solicitante): boolean {
  return solicitante.rol === ROLES.ADMINISTRADOR;
}

export function esOperario(solicitante: Solicitante): boolean {
  return solicitante.rol === ROLES.OPERARIO;
}

export function filtroGranjas(
  solicitante: Solicitante,
): Prisma.GranjaWhereInput | undefined {
  if (esAdministrador(solicitante)) return undefined;
  if (solicitante.rol === ROLES.PROPIETARIO) {
    return { propietario_id: solicitante.id };
  }
  return {
    activa: true,
    organizacion: { activa: true },
    galpones: {
      some: {
        activo: true,
        usuarios_galpones: {
          some: { usuario_id: solicitante.id, activa: true },
        },
      },
    },
  };
}

export function filtroGalpones(
  solicitante: Solicitante,
): Prisma.GalponWhereInput | undefined {
  if (esAdministrador(solicitante)) return undefined;
  if (solicitante.rol === ROLES.PROPIETARIO) {
    return { granja: { propietario_id: solicitante.id } };
  }
  return {
    activo: true,
    granja: { activa: true, organizacion: { activa: true } },
    usuarios_galpones: {
      some: { usuario_id: solicitante.id, activa: true },
    },
  };
}

export function filtroLotes(
  solicitante: Solicitante,
): Prisma.LoteWhereInput | undefined {
  const galpon = filtroGalpones(solicitante);
  return galpon ? { galpon } : undefined;
}

export function filtroSensores(
  solicitante: Solicitante,
): Prisma.SensorWhereInput | undefined {
  const galpon = filtroGalpones(solicitante);
  return galpon ? { galpon } : undefined;
}

export function filtroDispositivos(
  solicitante: Solicitante,
): Prisma.DispositivoWhereInput | undefined {
  const galpon = filtroGalpones(solicitante);
  return galpon ? { galpon } : undefined;
}

export function filtroEquipos(
  solicitante: Solicitante,
): Prisma.EquipoWhereInput | undefined {
  const galpon = filtroGalpones(solicitante);
  return galpon ? { galpon } : undefined;
}

export function filtroRegistrosDeLote(
  solicitante: Solicitante,
): { lote: Prisma.LoteWhereInput } | undefined {
  const lote = filtroLotes(solicitante);
  return lote ? { lote } : undefined;
}

export function filtroAlertas(
  solicitante: Solicitante,
): Prisma.AlertaWhereInput | undefined {
  const galpon = filtroGalpones(solicitante);
  return galpon ? { galpon } : undefined;
}

export function filtroAccionamientos(
  solicitante: Solicitante,
): Prisma.AccionamientoEquipoWhereInput | undefined {
  const equipo = filtroEquipos(solicitante);
  return equipo ? { equipo } : undefined;
}

export function filtroMantenimientos(
  solicitante: Solicitante,
): Prisma.MantenimientoWhereInput | undefined {
  const equipo = filtroEquipos(solicitante);
  return equipo ? { equipo } : undefined;
}

export async function verificarAccesoGranja(
  prisma: PrismaService,
  granjaId: number,
  solicitante: Solicitante,
  mensaje = SIN_ASIGNACION,
  propietarioId?: number,
): Promise<void> {
  if (esAdministrador(solicitante)) return;
  if (solicitante.rol === ROLES.PROPIETARIO && propietarioId !== undefined) {
    if (propietarioId !== solicitante.id) throw new ForbiddenException(mensaje);
    return;
  }
  const accesible = await prisma.granja.findFirst({
    where: { id: granjaId, ...filtroGranjas(solicitante) },
    select: { id: true },
  });
  if (!accesible) throw new ForbiddenException(mensaje);
}

export async function verificarAccesoGalpon(
  prisma: PrismaService,
  galponId: number,
  solicitante: Solicitante,
  mensaje = SIN_ASIGNACION,
  propietarioId?: number,
): Promise<void> {
  if (esAdministrador(solicitante)) return;
  if (solicitante.rol === ROLES.PROPIETARIO && propietarioId !== undefined) {
    if (propietarioId !== solicitante.id) throw new ForbiddenException(mensaje);
    return;
  }
  const accesible = await prisma.galpon.findFirst({
    where: { id: galponId, ...filtroGalpones(solicitante) },
    select: { id: true },
  });
  if (!accesible) throw new ForbiddenException(mensaje);
}

export async function verificarAccesoLote(
  prisma: PrismaService,
  loteId: number,
  solicitante: Solicitante,
  mensaje = SIN_ASIGNACION,
  propietarioId?: number,
): Promise<void> {
  if (esAdministrador(solicitante)) return;
  if (solicitante.rol === ROLES.PROPIETARIO && propietarioId !== undefined) {
    if (propietarioId !== solicitante.id) throw new ForbiddenException(mensaje);
    return;
  }
  const accesible = await prisma.lote.findFirst({
    where: { id: loteId, ...filtroLotes(solicitante) },
    select: { id: true },
  });
  if (!accesible) throw new ForbiddenException(mensaje);
}

export async function verificarAccesoSensor(
  prisma: PrismaService,
  sensorId: number,
  solicitante: Solicitante,
  mensaje = SIN_ASIGNACION,
  propietarioId?: number,
): Promise<void> {
  if (esAdministrador(solicitante)) return;
  if (solicitante.rol === ROLES.PROPIETARIO && propietarioId !== undefined) {
    if (propietarioId !== solicitante.id) throw new ForbiddenException(mensaje);
    return;
  }
  const accesible = await prisma.sensor.findFirst({
    where: { id: sensorId, ...filtroSensores(solicitante) },
    select: { id: true },
  });
  if (!accesible) throw new ForbiddenException(mensaje);
}

export async function verificarAccesoEquipo(
  prisma: PrismaService,
  equipoId: number,
  solicitante: Solicitante,
  mensaje = SIN_ASIGNACION,
  propietarioId?: number,
): Promise<void> {
  if (esAdministrador(solicitante)) return;
  if (solicitante.rol === ROLES.PROPIETARIO && propietarioId !== undefined) {
    if (propietarioId !== solicitante.id) throw new ForbiddenException(mensaje);
    return;
  }
  const accesible = await prisma.equipo.findFirst({
    where: { id: equipoId, ...filtroEquipos(solicitante) },
    select: { id: true },
  });
  if (!accesible) throw new ForbiddenException(mensaje);
}
