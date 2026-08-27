import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({
    example: 1,
    description: 'ID del galpón donde está instalado',
  })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID del dispositivo (ESP32) que lo reporta',
  })
  @IsInt()
  @Min(1)
  dispositivo_id: number;

  @ApiProperty({
    example: 'TEMP-G1-01',
    description: 'Código único del sensor',
  })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'temperatura', description: 'Variable que mide' })
  @IsString()
  tipo: string;

  @ApiProperty({ example: '°C', description: 'Unidad de medida' })
  @IsString()
  unidad_medida: string;

  @ApiPropertyOptional({ example: 'DHT22' })
  @IsString()
  @IsOptional()
  modelo?: string;

  @ApiPropertyOptional({ example: 'Aosong' })
  @IsString()
  @IsOptional()
  fabricante?: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Posición X en el galpón (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_x?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Posición Y en el galpón (metros)',
  })
  @IsNumber()
  @IsOptional()
  coordenada_y?: number;

  @ApiPropertyOptional({
    example: 1.8,
    description: 'Altura de instalación (metros)',
  })
  @IsNumber()
  @IsOptional()
  altura_metros?: number;

  @ApiPropertyOptional({
    example: '2026-07-24',
    description: 'Fecha de instalación',
  })
  @IsDateString()
  @IsOptional()
  fecha_instalacion?: string;

  @ApiPropertyOptional({
    example: '2026-07-24',
    description: 'Última calibración',
  })
  @IsDateString()
  @IsOptional()
  ultima_calibracion?: string;

  @ApiPropertyOptional({
    example: '2026-10-24',
    description: 'Próxima calibración',
  })
  @IsDateString()
  @IsOptional()
  proxima_calibracion?: string;
}
