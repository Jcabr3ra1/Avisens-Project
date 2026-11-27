import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DIRECCION_CON_TEXTO } from './datos-granja.dto';
import {
  AREA_MAXIMA_M2,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateGranjaDto {
  @ApiProperty({ example: 'Granja La Esperanza' })
  @NombreEntidad('El nombre de la granja', 120, true)
  nombre: string;

  @ApiPropertyOptional({ example: 'Vereda El Progreso km 4' })
  @TextoSeguro('La dirección', 200)
  @Matches(DIRECCION_CON_TEXTO, {
    message: 'La dirección debe indicar la vía con texto (calle, carrera, vereda…), no solo números',
  })
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Rionegro' })
  @NombreEntidad('El municipio', 100, false)
  @IsOptional()
  municipio?: string;

  @ApiPropertyOptional({ example: 'Antioquia' })
  @NombreEntidad('El departamento', 100, false)
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
  @Max(AREA_MAXIMA_M2)
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
