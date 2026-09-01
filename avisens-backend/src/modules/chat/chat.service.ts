import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { esAdministrador } from '../../common/auth/alcance';
import type { Solicitante } from '../../common/auth/acceso';
import { iniciales } from './contactos';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Las personas a las que el solicitante le puede escribir.
   *
   * Avisens es multiempresa: el propietario de una avícola no tiene por qué
   * ver ni escribirle al de otra empresa cliente. El administrador sí las
   * cruza todas, porque es quien da soporte.
   */
  async contactos(solicitante: Solicitante) {
    const where = this.filtroContactos(solicitante);
    if (!where) return [];

    const usuarios = await this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre_completo: true,
        organizacion_id: true,
        rol: { select: { nombre: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });

    return usuarios.map((usuario) => ({
      id: usuario.id,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol.nombre,
      iniciales: iniciales(usuario.nombre_completo),
      organizacion_id: usuario.organizacion_id,
    }));
  }

  private filtroContactos(
    solicitante: Solicitante,
  ): Prisma.UsuarioWhereInput | null {
    // Uno nunca es contacto de sí mismo: no se abre un chat consigo mismo.
    const base: Prisma.UsuarioWhereInput = {
      activo: true,
      id: { not: solicitante.id },
    };

    if (esAdministrador(solicitante)) return base;

    // Sin organización y sin ser administrador no hay a quién escribirle. La
    // alternativa —dejarlo ver a todos— convertiría un dato faltante en una
    // fuga entre empresas.
    if (solicitante.organizacion_id === undefined ||
        solicitante.organizacion_id === null) {
      return null;
    }

    return { ...base, organizacion_id: solicitante.organizacion_id };
  }
}
