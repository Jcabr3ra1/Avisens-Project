import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCatalogoSensorDto {
  @ApiProperty({ example: 'temperatura' })
  @IsString()
  tipo_sensor: string;

  @ApiProperty({ example: 'Sensor de temperatura' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 85000 })
  @IsNumber()
  @Min(0)
  precio_unitario_cop: number;

  @ApiPropertyOptional({ example: 250 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  cobertura_m2?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  obligatorio?: boolean;
}
