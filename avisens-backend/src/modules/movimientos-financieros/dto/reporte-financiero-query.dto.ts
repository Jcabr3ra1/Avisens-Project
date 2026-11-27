import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

/**
 * Filtro del reporte financiero por ciclo (HU-33).
 *
 * Se pide por lote (el ciclo completo, sin importar fechas) o por periodo
 * (fecha_desde y fecha_hasta, opcionalmente acotado a una granja). La
 * combinación válida la decide el servicio, porque depende de qué campos
 * llegan juntos.
 */
export class ReporteFinancieroQueryDto {
  @ApiPropertyOptional({ example: 4, description: 'Lote del ciclo a reportar' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Granja a la que se acota el reporte por periodo',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  granja_id?: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Inicio del periodo (incluido)',
  })
  @IsDateString()
  @IsOptional()
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Fin del periodo (incluido)',
  })
  @IsDateString()
  @IsOptional()
  fecha_hasta?: string;
}
