import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCurvaObjetivoDto } from './dto/create-curva-objetivo.dto';
import { UpdateCurvaObjetivoDto } from './dto/update-curva-objetivo.dto';
import { QueryCurvasObjetivoDto } from './dto/query-curvas-objetivo.dto';
import { paginate } from '../../common/pagination/paginate';

@Injectable()
export class CurvasObjetivoService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateCurvaObjetivoDto) {
    await this.verificarUnica(dto.marca, dto.sexo, dto.dia);
    return this.prisma.curvaObjetivo.create({
      data: {
        marca: dto.marca,
        fuente: dto.fuente,
        sexo: dto.sexo,
        dia: dto.dia,
        peso_esperado_g: dto.peso_esperado_g,
        consumo_diario_g: dto.consumo_diario_g,
        consumo_acumulado_g: dto.consumo_acumulado_g,
        fcr_objetivo: dto.fcr_objetivo,
        etapa_alimentacion: dto.etapa_alimentacion,
        temperatura_min: dto.temperatura_min,
        temperatura_max: dto.temperatura_max,
      },
    });
  }

  async listar({ marca, sexo, page, limit }: QueryCurvasObjetivoDto) {
    const where = {
      ...(marca ? { marca } : {}),
      ...(sexo ? { sexo } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.curvaObjetivo.findMany({
        where,
        orderBy: [{ marca: 'asc' }, { sexo: 'asc' }, { dia: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.curvaObjetivo.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const curva = await this.prisma.curvaObjetivo.findUnique({ where: { id } });
    if (!curva) throw new NotFoundException('Punto de curva no encontrado');
    return curva;
  }

  /**
   * Las curvas del manual no se tocan.
   *
   * Son datos de referencia del fabricante, no configuracion de la granja.
   * Cambiarle el peso objetivo del dia 21 a la curva de Italcol no arregla
   * nada: mueve la referencia contra la que se comparan los indicadores
   * durante todo el ciclo, y nadie nota que la comparacion dejo de significar
   * lo que decia. Lo que si hace falta es poder anadir marcas que no tenemos
   * —contegral y finca no tienen curva—, y esas si se editan y se borran.
   */
  private negarSiVieneDelManual(curva: { origen: string; marca: string }) {
    if (curva.origen !== 'seed') return;
    throw new ForbiddenException(
      `La curva de ${curva.marca} viene del manual del fabricante y no se edita. ` +
        'Puedes crear la curva de otra marca, o pedir que se corrija el seed.',
    );
  }

  async actualizar(id: number, dto: UpdateCurvaObjetivoDto) {
    const actual = await this.obtener(id);
    this.negarSiVieneDelManual(actual);
    const marca = dto.marca ?? actual.marca;
    const sexo = dto.sexo ?? actual.sexo;
    const dia = dto.dia ?? actual.dia;
    if (marca !== actual.marca || sexo !== actual.sexo || dia !== actual.dia) {
      await this.verificarUnica(marca, sexo, dia, id);
    }
    return this.prisma.curvaObjetivo.update({
      where: { id },
      data: {
        marca: dto.marca,
        fuente: dto.fuente,
        sexo: dto.sexo,
        dia: dto.dia,
        peso_esperado_g: dto.peso_esperado_g,
        consumo_diario_g: dto.consumo_diario_g,
        consumo_acumulado_g: dto.consumo_acumulado_g,
        fcr_objetivo: dto.fcr_objetivo,
        etapa_alimentacion: dto.etapa_alimentacion,
        temperatura_min: dto.temperatura_min,
        temperatura_max: dto.temperatura_max,
      },
    });
  }

  async eliminar(id: number) {
    const curva = await this.obtener(id);
    this.negarSiVieneDelManual(curva);
    await this.prisma.curvaObjetivo.delete({ where: { id } });
    return { id, eliminado: true };
  }

  private async verificarUnica(
    marca: string,
    sexo: string,
    dia: number,
    exceptoId?: number,
  ) {
    const existente = await this.prisma.curvaObjetivo.findUnique({
      where: { marca_sexo_dia: { marca, sexo, dia } },
    });
    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(
        `Ya existe un punto de curva para la marca ${marca}, sexo ${sexo} y dia ${dia}`,
      );
    }
  }
}
