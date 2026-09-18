import { ApiProperty } from '@nestjs/swagger';
import { EstadoCalculoPlan, SexoCurva } from '@prisma/client';

export class PlanLoteRespuestaDto {
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

  @ApiProperty({ type: Number, example: 3, nullable: true })
  curva_version_id: number | null;

  @ApiProperty({ type: Number, example: 1, nullable: true })
  linea_genetica_id_snapshot: number | null;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.mixto })
  sexo_curva_snapshot: SexoCurva;

  @ApiProperty({ example: '2026-07-30T00:00:00.000Z' })
  fecha_ingreso_snapshot: Date;

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

  @ApiProperty({ type: String, example: null, nullable: true })
  motivo: string | null;

  @ApiProperty({ example: 4 })
  creado_por_id: number;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  fecha_creacion: Date;

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

export class PlanLotePaginadoDto {
  @ApiProperty({ type: [PlanLoteRespuestaDto] })
  data: PlanLoteRespuestaDto[];

  @ApiProperty({ type: MetaPaginacionPlanesDto })
  meta: MetaPaginacionPlanesDto;
}
