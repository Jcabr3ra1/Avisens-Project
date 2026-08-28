import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class CreateZonaGalponDto {
  @ApiProperty({ example: 1, description: 'ID del galpón al que pertenece' })
  @IsInt()
  galpon_id: number;

  @ApiProperty({ example: 'Zona norte', description: 'Nombre de la zona' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'ZN-01', description: 'Código de la zona' })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiPropertyOptional({
    example: 'alimentacion',
    description: 'Tipo: alimentacion | descanso | ventilacion | otro',
  })
  @IsString()
  @IsOptional()
  tipo_zona?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Coordenada X inicio (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_inicio?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Coordenada Y inicio (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_inicio?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Coordenada X fin (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_fin?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Coordenada Y fin (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_fin?: number;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Color para visualización en mapa',
  })
  @IsString()
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
