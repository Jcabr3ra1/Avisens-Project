import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  NombreEntidad,
  PATRON_VERSION,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateModeloMlDto {
  @ApiProperty({
    example: 'prediccion-mortalidad',
    description: 'Nombre del modelo',
  })
  @NombreEntidad('El nombre del modelo', 120)
  nombre: string;

  @ApiPropertyOptional({
    example: 'regresion',
    description: 'Tipo: regresion | clasificacion | clustering',
  })
  @IsOptional()
  @TextoSeguro('El tipo de modelo', 60)
  tipo?: string;

  @ApiPropertyOptional({
    example: 'Predecir mortalidad acumulada',
    description: 'Objetivo del modelo',
  })
  @IsOptional()
  @TextoSeguro('El objetivo del modelo', 300, { multilinea: true })
  objetivo?: string;

  @ApiPropertyOptional({ example: '1.0.0', description: 'Versión del modelo' })
  @IsString()
  @MaxLength(30)
  @Matches(PATRON_VERSION, {
    message: 'La versión del modelo debe seguir formato semántico (ej.: 1.0.0)',
  })
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({
    example: 'scikit-learn',
    description: 'Framework usado',
  })
  @IsOptional()
  @TextoSeguro('El framework', 80)
  framework?: string;

  @ApiPropertyOptional({
    example: { rmse: 2.3, r2: 0.87 },
    description: 'Métricas del modelo (JSON)',
  })
  @IsObject()
  @IsOptional()
  metricas?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: '2026-08-27T15:30:00.000Z',
    description: 'Fecha y hora en que terminó el entrenamiento',
  })
  @IsDateString()
  @IsOptional()
  fecha_entrenamiento?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el modelo está activo',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
