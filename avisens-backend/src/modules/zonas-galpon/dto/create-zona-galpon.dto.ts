// dto/create-zona-galpon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateZonaGalponDto {
  @ApiProperty({
    example: 1,
    description: 'ID del galpón al que pertenece la zona',
  })
  @IsInt()
  @IsPositive()
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'ZONA-01',
    description: 'Código de la zona (opcional)',
  })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty({
    example: 'Zona de alimentación',
    description: 'Nombre de la zona',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    example: 'produccion',
    description: 'Tipo de zona: produccion | descanso | alimentacion | control',
  })
  @IsString()
  @IsOptional()
  tipo_zona?: string;

  @ApiPropertyOptional({
    example: 0.0,
    description: 'Coordenada X de inicio (para mapas)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_inicio?: number;

  @ApiPropertyOptional({
    example: 0.0,
    description: 'Coordenada Y de inicio (para mapas)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_inicio?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Coordenada X de fin (para mapas)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_fin?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Coordenada Y de fin (para mapas)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_fin?: number;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Color de visualización de la zona (hex)',
  })
  @IsString()
  @IsOptional()
  color_visualizacion?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo de la zona',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
