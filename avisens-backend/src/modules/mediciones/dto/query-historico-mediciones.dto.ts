import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const VARIABLES_HISTORICO = [
  'temperatura',
  'humedad',
  'co2',
  'nh3',
  'luminosidad',
] as const;

export type VariableHistorico = (typeof VARIABLES_HISTORICO)[number];

export class QueryHistoricoMedicionesDto {
  @ApiProperty({ example: 1, description: 'ID del galpón a consultar' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  galpon_id!: number;

  @ApiProperty({
    enum: VARIABLES_HISTORICO,
    example: 'temperatura',
    description: 'Variable ambiental a graficar',
  })
  @IsIn(VARIABLES_HISTORICO)
  variable!: VariableHistorico;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID de la zona del galpón (opcional)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  zona_id?: number;

  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Fecha inicial (inclusive)',
  })
  @IsDateString()
  desde!: string;

  @ApiProperty({
    example: '2026-11-27T23:59:59.999Z',
    description: 'Fecha final (inclusive)',
  })
  @IsDateString()
  hasta!: string;
}
