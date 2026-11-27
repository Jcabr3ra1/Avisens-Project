import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { VALOR_MAXIMO_MOVIMIENTO_COP } from '../../../common/avicultura/vocabulario';
import {
  HORAS_MAXIMO,
  TextoSeguro,
  UrlHttpSegura,
} from '../../../common/validation/texto';

export class CreateMantenimientoDto {
  @ApiProperty({
    example: 4,
    description: 'ID del equipo al que pertenece el mantenimiento',
  })
  @IsInt()
  @Min(1)
  equipo_id: number;

  @ApiPropertyOptional({
    example: 'Preventivo',
    description: 'Limpieza del contenedor del alimento',
  })
  @IsOptional()
  @TextoSeguro('El tipo de mantenimiento', 60)
  tipo?: string;

  @ApiProperty({
    example: '2026-08-25',
    description: 'Fecha programada del mantenimiento',
  })
  @IsDateString()
  fecha_programada: string;

  @ApiPropertyOptional({
    example: 'Juan Perez (externo)',
    description: 'Para técnicos que no son usuarios del sistema',
  })
  @IsOptional()
  @TextoSeguro('El técnico responsable', 120, { exigirLetras: true })
  tecnico_responsable?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Si el tecnico si es usuario del sistema',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  tecnico_id?: number;

  @ApiPropertyOptional({
    example: 'Cambio de correa y engrase',
    description: 'Descripción del trabajo o mantenimiento realizado',
  })
  @IsOptional()
  @TextoSeguro('La descripción', 500, { multilinea: true })
  descripcion?: string;

  @ApiPropertyOptional({
    example: 180000,
    description: 'Costo del mantenimiento en pesos colombianos (COP)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  costo_cop?: number;

  @ApiPropertyOptional({
    example: 'programado',
    description:
      'Estado del mantenimiento (ej. programado, en_proceso, completo, cancelado)',
  })
  @IsOptional()
  @TextoSeguro('El estado del mantenimiento', 40)
  estado?: string;

  @ApiPropertyOptional({
    example: 'https://storage.avisens.co/mant/31.jpg',
    description: 'URL de la imagen o evidencia del mantenimiento realizado',
  })
  @IsOptional()
  @UrlHttpSegura('La URL de evidencia', 500)
  evidencia_url?: string;

  @ApiPropertyOptional({
    example: 'Correa con desgaste alto',
    description: 'Observaciones adicionales registradas por el técnico',
  })
  @IsOptional()
  @TextoSeguro('Las observaciones', 500, { multilinea: true })
  observaciones?: string;

  @ApiPropertyOptional({
    example: '2026-08-25',
    description:
      'Fecha en que se ejecutó el mantenimiento (formato YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  fecha_ejecucion?: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Duración del mantenimiento en horas',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(HORAS_MAXIMO)
  duracion_horas?: number;

  @ApiPropertyOptional({
    example: 'Desgaste de correa',
    description: 'Causa de la falla que originó el mantenimiento',
  })
  @IsOptional()
  @TextoSeguro('La causa de la falla', 200)
  causa_falla?: string;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Tiempo que el equipo estuvo fuera de servicio durante el mantenimiento, en horas',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(HORAS_MAXIMO)
  tiempo_inactivo_horas?: number;
}
