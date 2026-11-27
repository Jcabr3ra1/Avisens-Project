import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Max,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CodigoAlfanumerico,
  DIMENSION_MAXIMA_M,
  TextoSeguro,
} from '../../../common/validation/texto';

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
    description:
      'Código único del sensor; si se omite, el backend genera el serial',
    required: false,
  })
  @IsOptional()
  @CodigoAlfanumerico('El código del sensor', 60, false)
  codigo?: string;

  @ApiProperty({ example: 'temperatura', description: 'Variable que mide' })
  @TextoSeguro('El tipo de sensor', 40, { requerido: true })
  tipo: string;

  @ApiPropertyOptional({
    example: 'gpio:18',
    nullable: true,
    description:
      'Conexión física estable dentro del ESP32: gpio:<n> para un DHT22 o rele:k1..rele:k4 para un relé; null conserva ingesta por código',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^(gpio:(0|[1-9]\d*)|rele:k[1-4])$/)
  canal?: string | null;

  @ApiPropertyOptional({
    example: '°C',
    description: 'Unidad de medida; si se omite, se deriva del tipo de sensor',
  })
  @IsOptional()
  @TextoSeguro('La unidad de medida', 20)
  unidad_medida?: string;

  @ApiPropertyOptional({ example: 'DHT22' })
  @IsOptional()
  @TextoSeguro('El modelo', 80)
  modelo?: string;

  @ApiPropertyOptional({ example: 'Aosong' })
  @IsOptional()
  @TextoSeguro('El fabricante', 80)
  fabricante?: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Posición X en el galpón (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_x?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Posición Y en el galpón (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(DIMENSION_MAXIMA_M)
  @IsOptional()
  coordenada_y?: number;

  @ApiPropertyOptional({
    example: 1.8,
    description: 'Altura de instalación (metros)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
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
