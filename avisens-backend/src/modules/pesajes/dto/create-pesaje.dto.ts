import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePesajeDto {
  @ApiProperty({ example: 1, description: 'ID del lote pesado' })
  @IsInt()
  lote_id: number;

  @ApiProperty({ example: '2026-08-08', description: 'Fecha del pesaje' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 1850, description: 'Peso promedio de las aves(g)' })
  @IsNumber()
  @IsPositive()
  peso_promedio_g: number;

  @ApiPropertyOptional({ example: 50, description: 'Cuantas aves se pesaron' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  cantidad_aves_pesadas?: number;

  @ApiPropertyOptional({
    example: 1600,
    description: 'Peso del ave mas liviana(g)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  peso_minimo_g?: number;

  @ApiPropertyOptional({
    example: 2100,
    description: 'Peso del ave más pesada (g)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  peso_maximo_g?: number;

  @ApiPropertyOptional({
    example: 1900,
    description: 'Peso esperado según la raza (g)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  peso_objetivo_g?: number;

  @ApiPropertyOptional({
    example: 'manual',
    description: 'Cómo se registró (manual, voz)',
  })
  @IsString()
  @IsOptional()
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Lote parejo, buen crecimiento' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
