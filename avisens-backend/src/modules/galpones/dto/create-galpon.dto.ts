import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateGalponDto {
  @ApiProperty({ example: 1, description: 'ID de la granja a la que pertenece' })
  @IsInt()
  granja_id: number;

  @ApiProperty({ example: 'galpon1', description: 'Coincide con el prefijo del topic MQTT' })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'Galpón Norte' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 5000, description: 'Cantidad de aves que alberga' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  capacidad_aves?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Ancho en metros' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  ancho_metros?: number;

  @ApiPropertyOptional({ example: 80, description: 'Largo en metros' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  largo_metros?: number;

  @ApiPropertyOptional({ example: 'norte-sur', description: 'Orientación del galpón' })
  @IsString()
  @IsOptional()
  orientacion?: string;

  @ApiPropertyOptional({ example: 'zinc', description: 'Tipo de techo' })
  @IsString()
  @IsOptional()
  tipo_techo?: string;

  @ApiPropertyOptional({ example: 'https://.../plano.pdf', description: 'URL del plano' })
  @IsString()
  @IsOptional()
  plano_url?: string;

  @ApiPropertyOptional({ example: '2024-03-15', description: 'Fecha de construcción (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fecha_construccion?: string;
}
