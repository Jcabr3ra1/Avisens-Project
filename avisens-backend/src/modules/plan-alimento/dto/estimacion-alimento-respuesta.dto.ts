import { TiempoCrianzaDto } from '../../plan-lote/dto/plan-lote-respuesta.dto';
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

  @ApiProperty({
    type: TiempoCrianzaDto,
    description: 'Tiempo de crianza del plan vigente, calculado al leer.',
  })
  tiempo: TiempoCrianzaDto;
}

export class BaseAlimentoEstimadoDto {
  @ApiProperty({ example: 1, description: 'Versión de la estimación usada' })
  estimacion_version: number;

  @ApiProperty({
    example: 2,
    description: 'Versión del plan de esa estimación',
  })
  plan_version: number;

  @ApiProperty({
    example: 21,
    description: 'Día de vida en que se fotografió la mortalidad (corte)',
  })
  dia_corte: number;

  @ApiProperty({ example: '2026-10-09T15:00:00.000Z' })
  calculada_el: Date;

  @ApiProperty({ example: 0 })
  antiguedad_dias: number;

  @ApiProperty({
    example: true,
    description: 'true si el corte de la estimación es el día de hoy',
  })
  corte_es_hoy: boolean;

  @ApiProperty({
    example: true,
    description:
      'false si el plan vigente ya es otro distinto al de esta estimación',
  })
  corresponde_al_plan_vigente: boolean;
}

export class AlimentoEstimadoDto {
  @ApiProperty({
    example: true,
    description:
      'false cuando el reparto no se puede reproducir con los snapshots: los kilos quedan null, nunca 0',
  })
  disponible: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    enum: [
      'estado_alimento_no_calculado',
      'algoritmo_distinto',
      'curva_no_disponible',
      'total_no_reproducible',
    ],
  })
  motivo_no_disponible: string | null;

  @ApiProperty({ type: BaseAlimentoEstimadoDto })
  base: BaseAlimentoEstimadoDto;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '3546.389',
    description:
      'Ciclo completo según la curva, no alimento realmente consumido',
  })
  total_kg: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '1185.639',
    description:
      'Estimado por la curva, días 1..dia_corte (día de corte completo); no es consumo medido',
  })
  hasta_corte_kg: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2360.750',
    description:
      'total_kg − hasta_corte_kg: lo estimado DESPUÉS del corte de esta estimación',
  })
  pendiente_tras_corte_kg: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2360.750',
    description:
      'Solo si el corte es de hoy (o ya cubre el objetivo), la estimación es del plan vigente y no está desactualizada; si no, null y hay que recalcular',
  })
  pendiente_desde_hoy_kg: string | null;

  @ApiProperty({ example: false })
  requiere_recalculo: boolean;

  @ApiProperty({
    type: [String],
    example: [],
    description:
      'corte_anterior_a_hoy y/o los motivos de desactualización existentes',
  })
  motivos_recalculo: string[];
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

  @ApiProperty({
    type: AlimentoEstimadoDto,
    description:
      'Reparto del total del ciclo en lo estimado hasta el corte y lo pendiente después, releído de los snapshots de la estimación (nunca de la mortalidad o la curva actuales).',
  })
  alimento_estimado: AlimentoEstimadoDto;
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
