import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import {
  AVES_MAXIMO_LOTE,
  DIMENSION_MAXIMA_M,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateGalponDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la granja a la que pertenece',
  })
  @IsInt()
  @Min(1)
  granja_id: number;

  @ApiProperty({ example: 'Galpón Norte' })
  @NombreEntidad('El nombre del galpón', 120, true)
  nombre: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Cantidad de aves que alberga',
  })
  @IsInt()
  @IsPositive()
  @Max(AVES_MAXIMO_LOTE)
  @IsOptional()
  capacidad_aves?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Ancho en metros' })
  @IsNumber()
  @IsPositive()
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  ancho_metros?: number;

  @ApiPropertyOptional({ example: 80, description: 'Largo en metros' })
  @IsNumber()
  @IsPositive()
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  largo_metros?: number;

  @ApiPropertyOptional({
    example: 'norte-sur',
    description: 'Orientación del galpón',
  })
  @TextoSeguro('La orientación', 60)
  @IsOptional()
  orientacion?: string;

  @ApiPropertyOptional({ example: 'zinc', description: 'Tipo de techo' })
  @TextoSeguro('El tipo de techo', 60)
  @IsOptional()
  tipo_techo?: string;

  @ApiPropertyOptional({
    example: '2024-03-15',
    description: 'Fecha de construcción (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  fecha_construccion?: string;
}
