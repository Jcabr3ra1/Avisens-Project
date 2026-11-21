import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DIRECCION_CON_TEXTO } from './datos-granja.dto';

export class CreateGranjaDto {
  @ApiProperty({ example: 'Granja La Esperanza' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Vereda El Progreso km 4' })
  @IsString()
  @Matches(DIRECCION_CON_TEXTO, {
    message: 'La dirección debe indicar la vía con texto (calle, carrera, vereda…), no solo números',
  })
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Rionegro' })
  @IsString()
  @IsOptional()
  municipio?: string;

  @ApiPropertyOptional({ example: 'Antioquia' })
  @IsString()
  @IsOptional()
  departamento?: string;

  @ApiPropertyOptional({
    example: 6.1553,
    description: 'Latitud GPS (-90 a 90)',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitud?: number;

  @ApiPropertyOptional({
    example: -75.3739,
    description: 'Longitud GPS (-180 a 180)',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitud?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Área total en m²' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  area_total_m2?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'ID del propietario. Solo lo usa el Administrador; el Propietario se asigna a sí mismo.',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  propietario_id?: number;
}
