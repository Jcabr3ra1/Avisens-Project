import { ApiProperty } from '@nestjs/swagger';
import { EstadoCalculoPlan, SexoCurva } from '@prisma/client';

export class LineaGeneticaResumenPlanDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ross_308' })
  codigo: string;

  @ApiProperty({ example: 'Ross 308' })
  nombre: string;
}

export class CreadoPorPlanDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Admin Plan' })
  nombre_completo: string;
}

export class SnapshotPlanDto {
  @ApiProperty({ type: LineaGeneticaResumenPlanDto, nullable: true })
  linea_genetica: LineaGeneticaResumenPlanDto | null;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.mixto })
  sexo_curva: SexoCurva;

  @ApiProperty({ example: '2026-07-30T00:00:00.000Z' })
  fecha_ingreso: Date;
}

export class CurvaPlanDto {
  @ApiProperty({ example: 3 })
  version_id: number;

  @ApiProperty({ type: LineaGeneticaResumenPlanDto })
  linea_genetica: LineaGeneticaResumenPlanDto;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.macho })
  sexo: SexoCurva;

  @ApiProperty({ example: 1, description: 'Versión de la curva, no del plan' })
  version: number;

  @ApiProperty({ example: 'aviagen-ross308-po-2022' })
  fuente: string;
}

export class ResultadoCalculoPlanDto {
  @ApiProperty({ type: Number, example: 35, nullable: true })
  dia_objetivo: number | null;

  @ApiProperty({ type: Number, example: 34.821543, nullable: true })
  dia_objetivo_interpolado: number | null;

  @ApiProperty({
    type: Date,
    example: '2026-09-02T00:00:00.000Z',
    nullable: true,
  })
  fecha_salida_calculada: Date | null;
}

export class PlanLoteHistorialItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  lote_id: number;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: true })
  vigente: boolean;

  @ApiProperty({ example: 2500 })
  peso_objetivo_g: number;

  @ApiProperty({
    enum: EstadoCalculoPlan,
    example: EstadoCalculoPlan.calculado,
  })
  estado_dia: EstadoCalculoPlan;

  @ApiProperty({ type: String, example: null, nullable: true })
  motivo: string | null;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  fecha_creacion: Date;

  @ApiProperty({ type: CreadoPorPlanDto })
  creado_por: CreadoPorPlanDto;

  @ApiProperty({ type: SnapshotPlanDto })
  snapshot: SnapshotPlanDto;

  @ApiProperty({ type: CurvaPlanDto, nullable: true })
  curva: CurvaPlanDto | null;

  @ApiProperty({ type: ResultadoCalculoPlanDto })
  resultado: ResultadoCalculoPlanDto;
}

// vigente/crear/recalcular agregan desactualizado; el historial no -- una
// version jubilada no se compara contra el lote actual (ver PlanLoteService).
export class PlanLoteRespuestaDto extends PlanLoteHistorialItemDto {
  @ApiProperty({
    example: false,
    description:
      'Derivado en el momento de la lectura: nunca se persiste. true si línea genética, sexo, fecha de ingreso o la curva vigente compatible cambiaron desde que se calculó este plan.',
  })
  desactualizado: boolean;
}

class MetaPaginacionPlanesDto {
  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class PlanLoteHistorialPaginadoDto {
  @ApiProperty({ type: [PlanLoteHistorialItemDto] })
  data: PlanLoteHistorialItemDto[];

  @ApiProperty({ type: MetaPaginacionPlanesDto })
  meta: MetaPaginacionPlanesDto;
}
