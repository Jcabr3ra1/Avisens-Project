import {
  ApiProperty,
  ApiPropertyOptional } from '@nestjs/swagger'; import {   IsInt,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { EstadoAccionamiento } from '@prisma/client';

export const ORIGENES_ACCIONAMIENTO = [
  'manual',
  'automatico',
  'voz',
  'programado',
] as const;

export const ESTADOS_ACCIONAMIENTO = ['encendido', 'apagado'] as const;

export class CreateAccionamientoEquipoDto {
  @ApiProperty({
    example: 1,
    description: 'ID del equipo que se acciona (debe tener es_actuador = true)',
  })
  @IsInt()
  @IsPositive()
  equipo_id: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la alerta que disparó el accionamiento (solo si fue por alerta)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  alerta_id?: number;

  @ApiPropertyOptional({
    example: 'automatico',
    description:
      'Origen del accionamiento: manual | automatico | voz | programado',
  })
  @IsString()
  @IsIn(ORIGENES_ACCIONAMIENTO)
  @IsOptional()
  origen?: string;

  @ApiPropertyOptional({
    example: EstadoAccionamiento.encendido,
    enum: EstadoAccionamiento,
    description: 'Estado del accionamiento',
  })
  @IsEnum(EstadoAccionamiento)
  @IsOptional()
  estado?: EstadoAccionamiento;

  @ApiPropertyOptional({
    example: 31.5,
    description: 'Valor de la variable que disparó la acción (ej: temperatura)',
  })
  @IsNumber()
  @IsOptional()
  valor_disparo?: number;

  @ApiPropertyOptional({
    example: '2026-08-12T09:15:00Z',
    description: 'Fecha de inicio del accionamiento (default: now())',
  })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;
}
