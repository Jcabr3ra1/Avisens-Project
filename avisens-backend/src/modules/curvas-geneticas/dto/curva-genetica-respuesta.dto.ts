import { ApiProperty } from '@nestjs/swagger';
import { EstadoCurvaVersion, SexoCurva } from '@prisma/client';

export class PuntoCurvaGeneticaRespuestaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 7 })
  dia: number;

  @ApiProperty({ example: 211 })
  peso_esperado_g: number;

  @ApiProperty({ type: Number, example: 24, nullable: true })
  consumo_diario_g: number | null;

  @ApiProperty({ type: Number, example: 164, nullable: true })
  consumo_acumulado_g: number | null;

  @ApiProperty({ type: Number, example: 0.78, nullable: true })
  fcr_objetivo: number | null;
}

// Cabecera sola, sin puntos: la forma que devuelve listar() (evita cargar
// todos los puntos de todas las curvas en una respuesta paginada).
export class CurvaGeneticaResumenDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  linea_genetica_id: number;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.macho })
  sexo: SexoCurva;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({
    enum: EstadoCurvaVersion,
    example: EstadoCurvaVersion.borrador,
  })
  estado: EstadoCurvaVersion;

  @ApiProperty({ example: false })
  vigente: boolean;

  @ApiProperty({ example: 'aviagen-ross308-po-2022' })
  fuente: string;

  @ApiProperty({ type: Date, example: null, nullable: true })
  fecha_publicacion: Date | null;

  @ApiProperty({ type: Number, example: null, nullable: true })
  publicada_por_id: number | null;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  fecha_creacion: Date;
}

// Cabecera + puntos: la forma de obtener()/crear()/publicar()/activar(), y
// del reemplazo de puntos.
export class CurvaGeneticaRespuestaDto extends CurvaGeneticaResumenDto {
  @ApiProperty({ type: [PuntoCurvaGeneticaRespuestaDto] })
  puntos: PuntoCurvaGeneticaRespuestaDto[];
}

class MetaPaginacionCurvasDto {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

export class CurvaGeneticaPaginadaDto {
  @ApiProperty({ type: [CurvaGeneticaResumenDto] })
  data: CurvaGeneticaResumenDto[];

  @ApiProperty({ type: MetaPaginacionCurvasDto })
  meta: MetaPaginacionCurvasDto;
}

export class CurvaGeneticaEliminadaRespuestaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: true })
  eliminado: boolean;
}
