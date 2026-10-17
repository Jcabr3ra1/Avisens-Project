import { Prisma } from '@prisma/client';
import type { PresupuestoTransaccion } from './presupuesto-transaccion';

/**
 * Orden de bloqueo de filas de los caminos coordinados por este hito
 * (asignar galpón, desactivar y eliminar usuario, desactivar organización y
 * revocar o eliminar las asignaciones de un galpón):
 * usuarios -> galpones -> sesiones -> usuarios_galpones, y dentro de cada
 * tabla por id ascendente. No cubre a todos los escritores de acceso del
 * proyecto: otros caminos quedan fuera de este orden. Un updateMany no garantiza ese orden: Postgres
 * bloquea las filas en el orden en que recorre la tabla. Por eso cada
 * revocación primero selecciona y bloquea sus filas con ORDER BY id FOR UPDATE
 * y después modifica solo esos ids, con el mismo cliente transaccional.
 * Cada sentencia es un paso del presupuesto de la transacción
 * (presupuesto-transaccion.ts): el bloqueo y la escritura nunca comparten paso.
 */
export const OPCIONES_TRANSACCION_ORDENADA = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 10000,
} as const;

interface FilaId {
  id: number;
}

const idsDe = (filas: FilaId[]) => filas.map((fila) => fila.id);

export async function revocarSesionesDelUsuario(
  p: PresupuestoTransaccion,
  usuarioId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (revocarSesionesDelUsuario)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "sesiones" WHERE "usuario_id" = ${usuarioId} AND "revocada" = false ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (revocarSesionesDelUsuario)', (tx) =>
    tx.sesion.updateMany({
      where: { id: { in: ids } },
      data: { revocada: true },
    }),
  );
}

export async function revocarSesionesDeLaOrganizacion(
  p: PresupuestoTransaccion,
  organizacionId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (revocarSesionesDeLaOrganizacion)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT s."id" FROM "sesiones" s JOIN "usuarios" u ON u."id" = s."usuario_id" WHERE u."organizacion_id" = ${organizacionId} AND s."revocada" = false ORDER BY s."id" FOR UPDATE OF s`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (revocarSesionesDeLaOrganizacion)', (tx) =>
    tx.sesion.updateMany({
      where: { id: { in: ids } },
      data: { revocada: true },
    }),
  );
}

export async function revocarAsignacionesDelUsuario(
  p: PresupuestoTransaccion,
  usuarioId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (revocarAsignacionesDelUsuario)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "usuarios_galpones" WHERE "usuario_id" = ${usuarioId} AND "activa" = true ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (revocarAsignacionesDelUsuario)', (tx) =>
    tx.usuarioGalpon.updateMany({
      where: { id: { in: ids } },
      data: { activa: false },
    }),
  );
}

export async function revocarAsignacionesDelGalpon(
  p: PresupuestoTransaccion,
  galponId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (revocarAsignacionesDelGalpon)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "usuarios_galpones" WHERE "galpon_id" = ${galponId} AND "activa" = true ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (revocarAsignacionesDelGalpon)', (tx) =>
    tx.usuarioGalpon.updateMany({
      where: { id: { in: ids } },
      data: { activa: false },
    }),
  );
}

export async function revocarAsignacionesDeLaOrganizacion(
  p: PresupuestoTransaccion,
  organizacionId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (revocarAsignacionesDeLaOrganizacion)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT ug."id" FROM "usuarios_galpones" ug JOIN "usuarios" u ON u."id" = ug."usuario_id" WHERE u."organizacion_id" = ${organizacionId} AND ug."activa" = true ORDER BY ug."id" FOR UPDATE OF ug`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (revocarAsignacionesDeLaOrganizacion)', (tx) =>
    tx.usuarioGalpon.updateMany({
      where: { id: { in: ids } },
      data: { activa: false },
    }),
  );
}

export async function eliminarAsignacionesDelGalpon(
  p: PresupuestoTransaccion,
  galponId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (eliminarAsignacionesDelGalpon)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "usuarios_galpones" WHERE "galpon_id" = ${galponId} ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (eliminarAsignacionesDelGalpon)', (tx) =>
    tx.usuarioGalpon.deleteMany({ where: { id: { in: ids } } }),
  );
}

export async function eliminarAsignacionesDelUsuario(
  p: PresupuestoTransaccion,
  usuarioId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (eliminarAsignacionesDelUsuario)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "usuarios_galpones" WHERE "usuario_id" = ${usuarioId} ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (eliminarAsignacionesDelUsuario)', (tx) =>
    tx.usuarioGalpon.deleteMany({ where: { id: { in: ids } } }),
  );
}

export async function eliminarSesionesDelUsuario(
  p: PresupuestoTransaccion,
  usuarioId: number,
) {
  const ids = idsDe(
    await p.paso(
      'bloquear filas (eliminarSesionesDelUsuario)',
      (tx) =>
        tx.$queryRaw<
          FilaId[]
        >`SELECT "id" FROM "sesiones" WHERE "usuario_id" = ${usuarioId} ORDER BY "id" FOR UPDATE`,
    ),
  );
  if (ids.length === 0) return;
  await p.paso('escribir filas (eliminarSesionesDelUsuario)', (tx) =>
    tx.sesion.deleteMany({ where: { id: { in: ids } } }),
  );
}
