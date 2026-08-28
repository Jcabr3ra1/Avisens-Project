import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateModeloMlDto {
  @ApiPropertyOptional({ example: 'prediccion-mortalidad', description: 'Nombre del modelo' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'regresion', description: 'Tipo: regresion | clasificacion | clustering' })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiPropertyOptional({ example: 'Predecir mortalidad acumulada', description: 'Objetivo del modelo' })
  @IsString()
  @IsOptional()
  objetivo?: string;

  @ApiPropertyOptional({ example: '1.0.0', description: 'Versión del modelo' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ example: 'scikit-learn', description: 'Framework usado' })
  @IsString()
  @IsOptional()
  framework?: string;

  @ApiPropertyOptional({ example: { rmse: 2.3, r2: 0.87 }, description: 'Métricas del modelo (JSON)' })
  @IsObject()
  @IsOptional()
  metricas?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true, description: 'Si el modelo está activo' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
