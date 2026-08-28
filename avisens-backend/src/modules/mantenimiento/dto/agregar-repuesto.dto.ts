import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AgregarRepuestoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  insumo_id: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidad: number;

  @ApiProperty({ example: 'mant-31-correa-01' })
  @IsString()
  @MaxLength(100)
  clave_idempotencia: string;

  @ApiPropertyOptional({ example: 'Correa de transmisión' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 85000, description: 'Costo total en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  costo_cop?: number;
}
