import { ApiProperty } from '@nestjs/swagger';
import {
  EstadoCalculoAlimento,
  EstadoDesgloseAlimento,
  SexoCurva,
} from '@prisma/client';
import {
  MOTIVOS_DESACTUALIZACION,
  MotivoDesactualizacion,
} from '../plan-alimento.service';

export class LineaGeneticaResumenAlimentoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ross_308' })
  codigo: string;

  @ApiProperty({ example: 'Ross 308' })
  nombre: string;
}

export class CreadoPorEstimacionDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Admin Plan' })
  nombre_completo: string;
}

export class CurvaEstimacionDto {
  @ApiProperty({ example: 3 })
  version_id: number;

  @ApiProperty({ type: LineaGeneticaResumenAlimentoDto })
  linea_genetica: LineaGeneticaResumenAlimentoDto;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.macho })
  sexo: SexoCurva;

  @ApiProperty({ example: 1, description: 'Versión de la curva, no del plan' })
  version: number;

  @ApiProperty({ example: 'aviagen-ross308-po-2022' })
  fuente: string;
}

export class PlanEstimacionDto {
  @ApiProperty({ example: 31 })
  id: number;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ type: Number, example: 21, nullable: true })
  dia_objetivo: number | null;

  @ApiProperty({
    type: Date,
    example: '2026-08-19T00:00:00.000Z',
    nullable: true,
  })
  fecha_salida_calculada: Date | null;

  @ApiProperty({ type: CurvaEstimacionDto, nullable: true })
  curva: CurvaEstimacionDto | null;
}

export class EntradaMortalidadDto {
  @ApiProperty({ example: 2 })
  dia: number;

  @ApiProperty({ example: 15 })
  muertes: number;
}

export class CorteEstimacionDto {
  @ApiProperty({ example: 10 })
  dia: number;

  @ApiProperty({ example: 1000 })
  cantidad_inicial: number;

  @ApiProperty({ type: Number, example: 25, nullable: true })
  muertes: number | null;

  @ApiProperty({ type: Number, example: 975, nullable: true })
  aves_vivas: number | null;

  @ApiProperty({ type: [EntradaMortalidadDto] })
  mortalidad_por_dia: EntradaMortalidadDto[];
}

export class ResultadoEstimacionDto {
  @ApiProperty({ type: Number, example: 1190.0, nullable: true })
  consumo_por_ave_g: number | null;

  @ApiProperty({ type: Number, example: 1161.85, nullable: true })
  consumo_total_kg: number | null;
}

export class RenglonDesgloseAlimentoDto {
  @ApiProperty({ example: 1 })
  orden: number;

  @ApiProperty({ type: Number, example: 9, nullable: true })
  tipo_alimento_id: number | null;

  @ApiProperty({ type: String, example: 'Preiniciador', nullable: true })
  tipo_alimento_nombre_snapshot: string | null;

  @ApiProperty({ type: String, example: 'preiniciacion', nullable: true })
  etapa: string | null;

  @ApiProperty({ example: 1 })
  dia_inicio: number;

  @ApiProperty({ example: 8 })
  dia_fin: number;

  @ApiProperty({ example: false })
  extendido_hasta_dia_objetivo: boolean;

  @ApiProperty({ type: Number, example: 80.0 })
  consumo_por_ave_g: number;

  @ApiProperty({ type: Number, example: 0.8 })
  consumo_total_kg: number;
}

export class DesgloseAlimentoDto {
  @ApiProperty({
    example: false,
    description:
      'true solo si la estimacion es anterior a Fase 2B: nunca se reconstruye retroactivamente.',
  })
  no_disponible: boolean;

  @ApiProperty({
    enum: EstadoDesgloseAlimento,
    nullable: true,
    example: EstadoDesgloseAlimento.calculado,
  })
  estado: EstadoDesgloseAlimento | null;

  @ApiProperty({
    type: String,
    example: 'desglose_etapas_rango_dias_v1',
    nullable: true,
  })
  version: string | null;

  @ApiProperty({ type: String, example: 'italcol', nullable: true })
  marca_alimento_snapshot: string | null;

  @ApiProperty({ type: [RenglonDesgloseAlimentoDto] })
  renglones: RenglonDesgloseAlimentoDto[];
}

export class PlanVigenteInfoDto {
  @ApiProperty({ example: 31 })
  id: number;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ type: Number, example: 21, nullable: true })
  dia_objetivo: number | null;

  @ApiProperty({ example: false })
  desactualizado: boolean;

  @ApiProperty({ example: true })
  es_el_mismo: boolean;
}

export class EstimacionAlimentoHistorialItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: true })
  vigente: boolean;

  @ApiProperty({
    enum: EstadoCalculoAlimento,
    example: EstadoCalculoAlimento.calculado,
  })
  estado_alimento: EstadoCalculoAlimento;

  @ApiProperty({ example: 'consumo_acumulado_lineal_muerte_fin_dia_v1' })
  version_algoritmo: string;

  @ApiProperty({ type: String, example: null, nullable: true })
  motivo: string | null;

  @ApiProperty({ example: '2026-09-19T00:00:00.000Z' })
  fecha_creacion: Date;

  @ApiProperty({ type: CreadoPorEstimacionDto })
  creado_por: CreadoPorEstimacionDto;

  @ApiProperty({ type: PlanEstimacionDto })
  plan: PlanEstimacionDto;

  @ApiProperty({ type: CorteEstimacionDto })
  corte: CorteEstimacionDto;

  @ApiProperty({ type: ResultadoEstimacionDto })
  resultado: ResultadoEstimacionDto;

  @ApiProperty({ type: DesgloseAlimentoDto })
  desglose: DesgloseAlimentoDto;

  @ApiProperty({
    example: true,
    description:
      'true solo en la estimación más reciente de TODO el lote. A lo sumo una por página; exactamente una en el conjunto completo.',
  })
  efectiva: boolean;
}

// GET singular y POST agregan plan_vigente/desactualizado/antiguedad_dias:
// no tiene sentido calcularlos contra el lote actual para una version
// jubilada del historial (misma decision que PlanLoteRespuestaDto, Fase 1).
export class EstimacionAlimentoRespuestaDto extends EstimacionAlimentoHistorialItemDto {
  @ApiProperty({ type: PlanVigenteInfoDto, nullable: true })
  plan_vigente: PlanVigenteInfoDto | null;

  @ApiProperty({
    example: false,
    description: 'Derivado en el momento de la lectura: nunca se persiste.',
  })
  desactualizado: boolean;

  @ApiProperty({
    enum: MOTIVOS_DESACTUALIZACION,
    isArray: true,
    example: [],
  })
  motivos_desactualizacion: MotivoDesactualizacion[];

  @ApiProperty({ example: 0 })
  antiguedad_dias: number;
}

class MetaPaginacionEstimacionesDto {
  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class EstimacionAlimentoHistorialPaginadoDto {
  @ApiProperty({ type: [EstimacionAlimentoHistorialItemDto] })
  data: EstimacionAlimentoHistorialItemDto[];

  @ApiProperty({ type: MetaPaginacionEstimacionesDto })
  meta: MetaPaginacionEstimacionesDto;
}
