// dto/update-zona-galpon.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateZonaGalponDto {
  @ApiPropertyOptional({
    example: 'ZONA-01',
    description: 'Código de la zona',
  })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiPropertyOptional({
    example: 'Zona de alimentación - actualizada',
    description: 'Nombre de la zona',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    example: 'descanso',
    description: 'Tipo de zona: produccion | descanso | alimentacion | control',
  })
  @IsString()
  @IsOptional()
  tipo_zona?: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Coordenada X de inicio',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_inicio?: number;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Coordenada Y de inicio',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_inicio?: number;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Coordenada X de fin',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x_fin?: number;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Coordenada Y de fin',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y_fin?: number;

  @ApiPropertyOptional({
    example: '#33FF57',
    description: 'Color de visualización de la zona (hex)',
  })
  @IsString()
  @IsOptional()
  color_visualizacion?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Estado activo/inactivo de la zona',
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
