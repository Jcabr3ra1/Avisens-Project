import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateConsumoDiarioDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  lote_id: number;

  @ApiProperty({ example: '2026-08-09', description: 'Fecha del consumo' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID del tipo de alimento consumido (catalogo tipos_alimento)',
  })
  @IsInt()
  @IsOptional()
  tipo_alimento_id?: number;

  @ApiPropertyOptional({ example: 45.5, description: 'Kg de alimento del dia' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  alimento_kg?: number;

  @ApiPropertyOptional({ example: 90, description: 'Litros de agua del dia' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  agua_litros?: number;

  @ApiPropertyOptional({ example: 'manual', description: 'Como se registro' })
  @IsString()
  @IsOptional()
  metodo_registro?: string;
}
