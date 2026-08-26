import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerarCotizacionDto } from './dto/generar-cotizacion.dto';
import { Prisma } from '@prisma/client';

// !!! VALORES PROVISIONALES !!! Ver el comentario del catalogo en seed.ts.
const INSTALACION_POR_GALPON_COP = 400000;
const AREA_GALPON_POR_DEFECTO_M2 = 500;

const PLANES = [
  { nombre: 'Basico', hasta_aves: 5000 },
  { nombre: 'Profesional', hasta_aves: 20000 },
  { nombre: 'Empresarial', hasta_aves: Infinity },
];

const AVES_POR_RANGO: Record<string, number> = {
  '<1000': 800,
  '1000-5000': 3000,
  '5000-10000': 7500,
  '>10000': 15000,
};

@Injectable()
export class CotizacionesService {
  constructor(private prisma: PrismaService) { }
  async generar(prospectoId: number, dto: GenerarCotizacionDto) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id: prospectoId },
      select: {
        id: true,
        estado: true,
        area_galpon_m2: true,
        area_granja_m2: true,
        respuestas: {
          where: { codigo_pregunta: 'A8' },
          select: { respuesta_texto: true },
        },
      },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');

    if (prospecto.estado === 'en_proceso' || prospecto.estado === 'nuevo') {
      throw new BadRequestException(
        'El prospecto no ha terminado el cuestionario',
      );
    }

    const areaGalpon = prospecto.area_galpon_m2 ?? AREA_GALPON_POR_DEFECTO_M2;
    const galpones =
      dto.numero_galpones ??
      Math.max(
        1,
        Math.round((prospecto.area_granja_m2 ?? areaGalpon) / areaGalpon),
      );

    const rango = prospecto.respuestas[0]?.respuesta_texto ?? '';
    // A8 pregunta las aves POR CICLO de toda la operacion, no por galpon:
    // no se multiplica por el numero de galpones.
    const aves = AVES_POR_RANGO[rango] ?? 0;
    const plan =
      PLANES.find((p) => aves <= p.hasta_aves)?.nombre ?? 'Empresarial';

    const catalogo = await this.prisma.catalogoSensor.findMany({
      where: {
        activo: true,
        ...(dto.incluir_opcionales ? {} : { obligatorio: true }),
      },
      orderBy: { precio_unitario_cop: 'desc' },
    });

    const lineas = catalogo.map((sensor) => {
      // Tolerancia del 5%: no se cobra un sensor extra por un excedente minimo.
      const porGalpon = sensor.cobertura_m2
        ? Math.max(1, Math.ceil(areaGalpon / sensor.cobertura_m2 - 0.05))
        : 1;
      const cantidad = porGalpon * galpones;
      return {
        tipo_sensor: sensor.tipo_sensor,
        nombre: sensor.nombre,
        cantidad,
        precio_unitario_cop: sensor.precio_unitario_cop,
        subtotal_cop: sensor.precio_unitario_cop.mul(cantidad),
      };
    });

    const instalacion = INSTALACION_POR_GALPON_COP * galpones;
    const total = lineas.reduce(
      (suma, l) => suma.plus(l.subtotal_cop),
      new Prisma.Decimal(instalacion),
    );

    const cotizacion = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.cotizacion.create({
        data: {
          prospecto_id: prospecto.id,
          codigo: `COT-${prospecto.id}-${Date.now().toString(36).toUpperCase()}`,
          plan_recomendado: plan,
          numero_galpones: galpones,
          numero_aves: aves,
          valor_total_cop: total,
          estado: 'generada',
        },
      });

      await tx.cotizacionSensor.createMany({
        data: lineas.map((l) => ({
          cotizacion_id: creada.id,
          tipo_sensor: l.tipo_sensor,
          cantidad: l.cantidad,
        })),
      });

      return creada;
    });

    return {
      id: cotizacion.id,
      codigo: cotizacion.codigo,
      plan_recomendado: plan,
      numero_galpones: galpones,
      area_galpon_m2: areaGalpon,
      numero_aves_estimado: aves,
      lineas,
      instalacion_cop: instalacion,
      valor_total_cop: total,
      nota: 'Valores de referencia. La cotizacion definitiva la confirma un asesor.',
    };
  }

  async listarDeProspecto(prospectoId: number) {
    return this.prisma.cotizacion.findMany({
      where: { prospecto_id: prospectoId },
      orderBy: { fecha_generacion: 'desc' },
      include: { sensores: true },
    });
  }
}
