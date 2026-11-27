import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import {
  CodigoAlfanumerico,
  DIMENSION_MAXIMA_M,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateZonaGalponDto {
  @ApiProperty({ example: 1, description: 'ID del galpón al que pertenece' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({ example: 'Zona norte', description: 'Nombre de la zona' })
  @NombreEntidad('El nombre de la zona', 100)
  nombre: string;

  @ApiPropertyOptional({ example: 'ZN-01', description: 'Código de la zona' })
  @IsOptional()
  @CodigoAlfanumerico('El código de la zona', 40, false)
  codigo?: string;

  @ApiPropertyOptional({
    example: 'alimentacion',
    description: 'Tipo: alimentacion | descanso | ventilacion | otro',
  })
  @IsOptional()
  @TextoSeguro('El tipo de zona', 40)
  tipo_zona?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Coordenada X inicio (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_x_inicio?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Coordenada Y inicio (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_y_inicio?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Coordenada X fin (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_x_fin?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Coordenada Y fin (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_y_fin?: number;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Color para visualización en mapa',
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/, {
    message: 'El color debe ser un código hexadecimal válido (ej.: #FF5733)',
  })
  @IsOptional()
  color_visualizacion?: string;

  @ApiPropertyOptional({ example: true, description: 'Si la zona está activa' })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}

export class ListarZonasGalponDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por galpón' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  galpon_id?: number;
}
