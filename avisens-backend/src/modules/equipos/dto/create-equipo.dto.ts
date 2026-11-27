import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { VALOR_MAXIMO_MOVIMIENTO_COP } from '../../../common/avicultura/vocabulario';
import {
  CodigoAlfanumerico,
  DIMENSION_MAXIMA_M,
  HORAS_MAXIMO,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateEquipoDto {
  @ApiProperty({ example: 1, description: 'ID del galpón donde está instalado' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({ example: 'EQ-G1-VENT-01', description: 'Código único del equipo' })
  @CodigoAlfanumerico('El código del equipo', 60)
  codigo: string;

  @ApiProperty({ example: 'Ventilador norte', description: 'Nombre del equipo' })
  @NombreEntidad('El nombre del equipo', 120)
  nombre: string;

  @ApiPropertyOptional({ example: 'ventilador', description: 'Tipo: ventilador | calefaccion | comedero | bebedero | otro' })
  @IsOptional()
  @TextoSeguro('El tipo de equipo', 40)
  tipo?: string;

  @ApiPropertyOptional({ example: true, description: 'Si es un actuador (se puede accionar remotamente)' })
  @IsBoolean()
  @IsOptional()
  es_actuador?: boolean;

  @ApiPropertyOptional({ example: 'RV-350', description: 'Modelo del equipo' })
  @IsOptional()
  @TextoSeguro('El modelo', 80)
  modelo?: string;

  @ApiPropertyOptional({ example: 'Fancom', description: 'Fabricante' })
  @IsOptional()
  @TextoSeguro('El fabricante', 80)
  fabricante?: string;

  @ApiPropertyOptional({ example: 'SN-2026-001', description: 'Número de serie' })
  @IsOptional()
  @CodigoAlfanumerico('El número de serie', 80, false)
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
  @Max(HORAS_MAXIMO)
  @IsOptional()
  vida_util_horas?: number;

  @ApiPropertyOptional({ example: 'operativo', description: 'Estado: operativo | mantenimiento | averiado | retirado' })
  @IsOptional()
  @TextoSeguro('El estado del equipo', 40)
  estado_actual?: string;

  @ApiPropertyOptional({ example: 'automatico', description: 'Modo de operación: manual | automatico' })
  @IsOptional()
  @TextoSeguro('El modo de operación', 40)
  modo_operacion?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Posición X en el galpón (metros)' })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_x?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Posición Y en el galpón (metros)' })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_y?: number;

  @ApiPropertyOptional({ example: 850000, description: 'Costo en COP' })
  @IsNumber()
  @Min(0)
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  @IsOptional()
  costo_cop?: number;
}
