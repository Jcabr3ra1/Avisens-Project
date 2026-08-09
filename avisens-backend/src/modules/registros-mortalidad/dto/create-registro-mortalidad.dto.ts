import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateRegistroMortalidadDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  lote_id: number;

  @ApiProperty({ example: '2026-08-08', description: 'Fecha de la mortalidad' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 12, description: 'Cantidad de aves muertas' })
  @IsInt()
  @IsPositive()
  cantidad_aves: number;

  @ApiPropertyOptional({
    example: 'Golpe de calor',
    description: 'Causa probable',
  })
  @IsString()
  @IsOptional()
  causa_presuntiva?: string;

  @ApiPropertyOptional({
    example: 'Incineración',
    description: 'Qué se hizo con las aves',
  })
  @IsString()
  @IsOptional()
  disposicion?: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Cómo se registró' })
  @IsString()
  @IsOptional()
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Concentradas en la esquina norte' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
