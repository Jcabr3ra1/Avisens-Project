import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicadoresService } from '../indicadores/indicadores.service';
import { Solicitante } from '../../common/auth/acceso';
import {
  esAdministrador,
  verificarAccesoGalpon,
  verificarAccesoLote,
} from '../../common/auth/alcance';

const UMBRAL_COSTO_KG = 4000;

const RECOMENDACION_SELECT = {
  id: true,
  lote_id: true,
  galpon_id: true,
  tipo: true,
  titulo: true,
  descripcion: true,
  accion_sugerida: true,
  prioridad: true,
  estado: true,
  fecha_generacion: true,
  fecha_resolucion: true,
} as const;

@Injectable()
export class RecomendacionesService {
  constructor(
    private prisma: PrismaService,
    private indicadores: IndicadoresService,
  ) {}

  private async obtenerLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        galpon_id: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes gestionar recomendaciones de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
    return lote;
  }

  private async crearSiNoExiste(datos: {
    lote_id: number;
    galpon_id: number;
    tipo: string;
    titulo: string;
    descripcion: string;
    accion_sugerida: string;
    prioridad: string;
  }) {
    const existe = await this.prisma.recomendacion.findFirst({
      where: { lote_id: datos.lote_id, tipo: datos.tipo, estado: 'pendiente' },
    });
    if (existe) return null;
    return this.prisma.recomendacion.create({
      data: datos,
      select: RECOMENDACION_SELECT,
    });
  }

  async generar(loteId: number, solicitante: Solicitante) {
    const lote = await this.obtenerLote(loteId, solicitante);
    const creadas = [];

    const comparacion = await this.indicadores.compararConCurva(
      loteId,
      solicitante,
    );
    if (comparacion.veredicto === 'por_debajo') {
      const desvio = comparacion.desvio_peso_pct?.toFixed(1) ?? '?';
      const r = await this.crearSiNoExiste({
        lote_id: loteId,
        galpon_id: lote.galpon_id,
        tipo: 'peso_bajo',
        titulo: 'El lote va por debajo de la curva objetivo',
        descripcion: `El peso real esta ${desvio}% por debajo de lo esperado (dia ${comparacion.dia_vida}).`,
        accion_sugerida:
          'Revisa el consumo de alimento, la densidad y la temperatura del galpon.',
        prioridad: 'alta',
      });
      if (r) creadas.push(r);
    }

    const kpis = await this.indicadores.kpisFinancieros(loteId, solicitante);
    if (
      kpis.costo_por_kg_cop != null &&
      kpis.costo_por_kg_cop > UMBRAL_COSTO_KG
    ) {
      const r = await this.crearSiNoExiste({
        lote_id: loteId,
        galpon_id: lote.galpon_id,
        tipo: 'costo_alto',
        titulo: 'Costo de produccion elevado',
        descripcion: `El costo por kg es de $${Math.round(kpis.costo_por_kg_cop)} COP (umbral $${UMBRAL_COSTO_KG}).`,
        accion_sugerida:
          'Revisa los precios del alimento y la conversion alimenticia (FCR).',
        prioridad: 'media',
      });
      if (r) creadas.push(r);
    }

    return {
      lote_id: loteId,
      generadas: creadas.length,
      recomendaciones: creadas,
    };
  }

  async listar(loteId: number, solicitante: Solicitante) {
    await this.obtenerLote(loteId, solicitante);
    return this.prisma.recomendacion.findMany({
      where: { lote_id: loteId },
      select: RECOMENDACION_SELECT,
      orderBy: { fecha_generacion: 'desc' },
    });
  }

  async resolver(id: number, solicitante: Solicitante) {
    const rec = await this.prisma.recomendacion.findUnique({
      where: { id },
      select: {
        id: true,
        lote_id: true,
        galpon_id: true,
        lote: {
          select: {
            galpon: {
              select: { granja: { select: { propietario_id: true } } },
            },
          },
        },
      },
    });
    if (!rec) throw new NotFoundException('Recomendacion no encontrada');
    if (rec.lote && rec.lote_id) {
      await verificarAccesoLote(
        this.prisma,
        rec.lote_id,
        solicitante,
        'Solo puedes resolver recomendaciones de tus propios lotes',
        rec.lote.galpon.granja.propietario_id,
      );
    } else if (rec.galpon_id !== null) {
      await verificarAccesoGalpon(
        this.prisma,
        rec.galpon_id,
        solicitante,
        'No tienes acceso a recomendaciones de este galpón',
      );
    } else if (!esAdministrador(solicitante)) {
      throw new ForbiddenException(
        'No tienes acceso a recomendaciones sin un galpón asociado',
      );
    }
    return this.prisma.recomendacion.update({
      where: { id },
      data: { estado: 'resuelta', fecha_resolucion: new Date() },
      select: RECOMENDACION_SELECT,
    });
  }
}
