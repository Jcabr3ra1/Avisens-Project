import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateEquipoDto {
  @ApiProperty({ example: 1, description: 'ID del galpón donde está instalado' })
  @IsInt()
  galpon_id: number;

  @ApiProperty({ example: 'EQ-G1-VENT-01', description: 'Código único del equipo' })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'Ventilador norte', description: 'Nombre del equipo' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'ventilador', description: 'Tipo: ventilador | calefaccion | comedero | bebedero | otro' })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiPropertyOptional({ example: true, description: 'Si es un actuador (se puede accionar remotamente)' })
  @IsBoolean()
  @IsOptional()
  es_actuador?: boolean;

  @ApiPropertyOptional({ example: 'RV-350', description: 'Modelo del equipo' })
  @IsString()
  @IsOptional()
  modelo?: string;

  @ApiPropertyOptional({ example: 'Fancom', description: 'Fabricante' })
  @IsString()
  @IsOptional()
  fabricante?: string;

  @ApiPropertyOptional({ example: 'SN-2026-001', description: 'Número de serie' })
  @IsString()
  @IsOptional()
  serial?: string;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Fecha de compra' })
  @IsDateString()
  @IsOptional()
  fecha_compra?: string;

  @ApiPropertyOptional({ example: '2026-02-01', description: 'Fecha de instalación' })
  @IsDateString()
  @IsOptional()
  fecha_instalacion?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Vida útil estimada en horas' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  vida_util_horas?: number;

  @ApiPropertyOptional({ example: 'operativo', description: 'Estado: operativo | mantenimiento | averiado | retirado' })
  @IsString()
  @IsOptional()
  estado_actual?: string;

  @ApiPropertyOptional({ example: 'automatico', description: 'Modo de operación: manual | automatico' })
  @IsString()
  @IsOptional()
  modo_operacion?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Posición X en el galpón (metros)' })
  @IsNumber()
  @IsOptional()
  coordenada_x?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Posición Y en el galpón (metros)' })
  @IsNumber()
  @IsOptional()
  coordenada_y?: number;

  @ApiPropertyOptional({ example: 850000, description: 'Costo en COP' })
  @IsNumber()
  @IsOptional()
  costo_cop?: number;
}
