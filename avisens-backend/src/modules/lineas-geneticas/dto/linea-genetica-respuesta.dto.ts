import { ApiProperty } from '@nestjs/swagger';

export class LineaGeneticaRespuestaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ross_308' })
  codigo: string;

  @ApiProperty({ example: 'Ross 308' })
  nombre: string;

  @ApiProperty({ type: String, example: null, nullable: true })
  descripcion: string | null;

  @ApiProperty({ example: true })
  activo: boolean;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  fecha_actualizacion: Date;
}

class MetaPaginacionLineasDto {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

export class LineaGeneticaPaginadaDto {
  @ApiProperty({ type: [LineaGeneticaRespuestaDto] })
  data: LineaGeneticaRespuestaDto[];

  @ApiProperty({ type: MetaPaginacionLineasDto })
  meta: MetaPaginacionLineasDto;
}

export class LineaGeneticaEstadoRespuestaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: true })
  activo: boolean;
}
