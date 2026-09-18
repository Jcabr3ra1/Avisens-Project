import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SexoCurva } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import { CreateCurvaGeneticaDto } from './dto/create-curva-genetica.dto';
import { ReemplazarPuntosCurvaDto } from './dto/reemplazar-puntos-curva.dto';

const CURVA_SELECT = {
  id: true,
  linea_genetica_id: true,
  sexo: true,
  version: true,
  estado: true,
  vigente: true,
  fuente: true,
  fecha_publicacion: true,
  publicada_por_id: true,
  fecha_creacion: true,
} as const;

const CURVA_SELECT_CON_PUNTOS = {
  ...CURVA_SELECT,
  puntos: {
    select: {
      id: true,
      dia: true,
      peso_esperado_g: true,
      consumo_diario_g: true,
      consumo_acumulado_g: true,
      fcr_objetivo: true,
    },
    orderBy: { dia: 'asc' },
  },
} as const;

// Clave entera para el advisory lock de activar(): (linea_genetica_id, sexo)
// no es una fila existente que un FOR UPDATE pueda bloquear -- dos
// activaciones concurrentes para la misma combinacion podrian ambas ver "no
// hay vigente" y ambas intentar activarse. El lock serializa por la
// combinacion misma, no por ninguna fila.
const ORDINAL_SEXO: Record<SexoCurva, number> = {
  macho: 0,
  hembra: 1,
  mixto: 2,
};

@Injectable()
export class CurvasGeneticasService {
  constructor(private prisma: PrismaService) {}

  private esConflictoUnico(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  async crear(dto: CreateCurvaGeneticaDto) {
    const linea = await this.prisma.lineaGenetica.findUnique({
      where: { id: dto.linea_genetica_id },
      select: { id: true, activo: true },
    });
    if (!linea) throw new NotFoundException('Línea genética no encontrada');
    if (!linea.activo) {
      throw new ConflictException(
        'No se pueden crear curvas nuevas para una línea genética inactiva',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Serializa por (linea_genetica_id, sexo): sin este lock, dos POST
      // concurrentes podrian ambos leer el mismo maximo historico y calcular
      // la misma version -- uno chocaria con P2002 crudo en vez de recibir
      // la version siguiente real.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${dto.linea_genetica_id}, ${ORDINAL_SEXO[dto.sexo]})`;

      // version = maximo historico + 1, nunca 1 fijo: es el mismo bug que
      // crear->jubilar->crear dejo en Umbrales cuando la version se asumia
      // siempre 1 en vez de leer el historial.
      const ultima = await tx.curvaGeneticaVersion.findFirst({
        where: { linea_genetica_id: dto.linea_genetica_id, sexo: dto.sexo },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = ultima ? ultima.version + 1 : 1;

      try {
        return await tx.curvaGeneticaVersion.create({
          data: {
            linea_genetica_id: dto.linea_genetica_id,
            sexo: dto.sexo,
            version,
            fuente: dto.fuente,
          },
          select: CURVA_SELECT_CON_PUNTOS,
        });
      } catch (error: unknown) {
        if (this.esConflictoUnico(error)) {
          throw new ConflictException(
            'Ya existe una versión con ese número para esta línea y sexo; vuelve a intentarlo',
          );
        }
        throw error;
      }
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.curvaGeneticaVersion.findMany({
        select: CURVA_SELECT,
        orderBy: [
          { linea_genetica_id: 'asc' },
          { sexo: 'asc' },
          { version: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.curvaGeneticaVersion.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const curva = await this.prisma.curvaGeneticaVersion.findUnique({
      where: { id },
      select: CURVA_SELECT_CON_PUNTOS,
    });
    if (!curva) throw new NotFoundException('Curva genética no encontrada');
    return curva;
  }

  async reemplazarPuntos(id: number, dto: ReemplazarPuntosCurvaDto) {
    const dias = dto.puntos.map((p) => p.dia);
    if (new Set(dias).size !== dias.length) {
      throw new BadRequestException(
        'No puede haber días repetidos en el conjunto de puntos',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Bloquea la fila y vuelve a comprobar el estado DESPUES de obtener el
      // bloqueo: sin este orden, una peticion que leyo "borrador" podria
      // escribir puntos despues de que otra ya publico la curva.
      const [curva] = await tx.$queryRaw<Array<{ id: number; estado: string }>>`
        SELECT "id", "estado" FROM "curvas_geneticas_version"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!curva) throw new NotFoundException('Curva genética no encontrada');
      if (curva.estado !== 'borrador') {
        throw new ConflictException(
          'Solo se pueden reemplazar los puntos de una curva en borrador',
        );
      }

      await tx.puntoCurvaGenetica.deleteMany({
        where: { curva_version_id: id },
      });
      if (dto.puntos.length > 0) {
        await tx.puntoCurvaGenetica.createMany({
          data: dto.puntos.map((p) => ({
            curva_version_id: id,
            dia: p.dia,
            peso_esperado_g: p.peso_esperado_g,
            consumo_diario_g: p.consumo_diario_g,
            consumo_acumulado_g: p.consumo_acumulado_g,
            fcr_objetivo: p.fcr_objetivo,
          })),
        });
      }

      return tx.curvaGeneticaVersion.findUniqueOrThrow({
        where: { id },
        select: CURVA_SELECT_CON_PUNTOS,
      });
    });
  }

  async publicar(id: number, solicitante: Solicitante) {
    return this.prisma.$transaction(async (tx) => {
      const [curva] = await tx.$queryRaw<Array<{ id: number; estado: string }>>`
        SELECT "id", "estado" FROM "curvas_geneticas_version"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!curva) throw new NotFoundException('Curva genética no encontrada');
      if (curva.estado !== 'borrador') {
        throw new ConflictException(
          'Solo se puede publicar una curva en borrador',
        );
      }

      const puntos = await tx.puntoCurvaGenetica.findMany({
        where: { curva_version_id: id },
        orderBy: { dia: 'asc' },
        select: { dia: true, peso_esperado_g: true, consumo_acumulado_g: true },
      });
      this.validarParaPublicar(puntos);

      return tx.curvaGeneticaVersion.update({
        where: { id },
        data: {
          estado: 'publicada',
          fecha_publicacion: new Date(),
          publicada_por_id: solicitante.id,
        },
        select: CURVA_SELECT_CON_PUNTOS,
      });
    });
  }

  /**
   * Dias unicos y ascendentes ya los garantiza @@unique([curva_version_id,
   * dia]) mas el ORDER BY dia asc con el que se leyeron los puntos -- no hay
   * forma de que dos puntos de la misma version compartan dia, ni de que
   * lleguen aqui fuera de orden. Lo que si hay que validar es lo que ninguna
   * restriccion de columna puede expresar: la relacion ENTRE filas.
   */
  private validarParaPublicar(
    puntos: Array<{
      dia: number;
      peso_esperado_g: Prisma.Decimal;
      consumo_acumulado_g: Prisma.Decimal | null;
    }>,
  ) {
    if (puntos.length < 2) {
      throw new BadRequestException(
        'Se requieren al menos 2 puntos para publicar una curva',
      );
    }

    let pesoAnterior: Prisma.Decimal | null = null;
    let consumoAnteriorPresente: Prisma.Decimal | null = null;

    for (const punto of puntos) {
      if (pesoAnterior !== null && punto.peso_esperado_g.lt(pesoAnterior)) {
        throw new BadRequestException(
          `El peso esperado del día ${punto.dia} es menor que el del día anterior; la curva de peso no puede decrecer`,
        );
      }
      pesoAnterior = punto.peso_esperado_g;

      // Compara solo entre valores presentes: un dia sin consumo_acumulado_g
      // no rompe la cadena, simplemente se salta.
      if (punto.consumo_acumulado_g !== null) {
        if (
          consumoAnteriorPresente !== null &&
          punto.consumo_acumulado_g.lt(consumoAnteriorPresente)
        ) {
          throw new BadRequestException(
            `El consumo acumulado del día ${punto.dia} es menor que el último valor registrado; no puede decrecer`,
          );
        }
        consumoAnteriorPresente = punto.consumo_acumulado_g;
      }
    }
  }

  async activar(id: number) {
    const curva = await this.prisma.curvaGeneticaVersion.findUnique({
      where: { id },
      select: {
        id: true,
        linea_genetica_id: true,
        sexo: true,
        linea_genetica: { select: { activo: true } },
      },
    });
    if (!curva) throw new NotFoundException('Curva genética no encontrada');
    if (!curva.linea_genetica.activo) {
      throw new ConflictException(
        'No se puede activar una curva cuya línea genética está inactiva',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Serializa por (linea_genetica_id, sexo). El indice unico parcial
      // sigue siendo la defensa final, pero sin este lock dos activaciones
      // concurrentes para la misma combinacion podrian ambas leer "no hay
      // vigente" y ambas intentar activarse antes de que la otra confirme.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${curva.linea_genetica_id}, ${ORDINAL_SEXO[curva.sexo]})`;

      const [fresca] = await tx.$queryRaw<Array<{ estado: string }>>`
        SELECT "estado" FROM "curvas_geneticas_version"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!fresca) throw new NotFoundException('Curva genética no encontrada');
      if (fresca.estado !== 'publicada') {
        throw new ConflictException(
          'Solo se puede activar una curva publicada',
        );
      }

      await tx.curvaGeneticaVersion.updateMany({
        where: {
          linea_genetica_id: curva.linea_genetica_id,
          sexo: curva.sexo,
          vigente: true,
        },
        data: { vigente: false },
      });

      return tx.curvaGeneticaVersion.update({
        where: { id },
        data: { vigente: true },
        select: CURVA_SELECT_CON_PUNTOS,
      });
    });
  }

  async eliminar(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const [curva] = await tx.$queryRaw<Array<{ estado: string }>>`
        SELECT "estado" FROM "curvas_geneticas_version"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!curva) throw new NotFoundException('Curva genética no encontrada');
      if (curva.estado !== 'borrador') {
        throw new ConflictException(
          'Solo se puede eliminar una curva en borrador',
        );
      }
      await tx.curvaGeneticaVersion.delete({ where: { id } });
      return { id, eliminado: true };
    });
  }
}
