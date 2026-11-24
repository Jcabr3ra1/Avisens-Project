import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { VALOR_MAXIMO_MOVIMIENTO_COP } from '../../../common/avicultura/vocabulario';
import {
  AREA_MAXIMA_M2,
  CodigoAlfanumerico,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateCatalogoSensorDto {
  @ApiProperty({ example: 'temperatura' })
  @CodigoAlfanumerico('El tipo de sensor', 40)
  tipo_sensor: string;

  @ApiProperty({ example: 'Sensor de temperatura' })
  @NombreEntidad('El nombre del sensor', 120)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TextoSeguro('La descripción', 500, { multilinea: true })
  descripcion?: string;

  @ApiProperty({ example: 85000 })
  @IsNumber()
  @Min(0)
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  precio_unitario_cop: number;

  @ApiPropertyOptional({ example: 250 })
  @IsNumber()
  @Min(0.01)
  @Max(AREA_MAXIMA_M2)
  @IsOptional()
  cobertura_m2?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  obligatorio?: boolean;
}
