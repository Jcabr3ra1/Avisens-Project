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
  NombreEntidad,
  STOCK_MAXIMO,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateInsumoDto {
  @ApiProperty({ example: 1, description: 'Granja a la que pertenece el insumo' })
  @IsInt()
  @Min(1)
  granja_id: number;

  @ApiProperty({ example: 'Alimento iniciación' })
  @NombreEntidad('El nombre del insumo', 120, true)
  nombre: string;

  @ApiPropertyOptional({
    example: 'alimento',
    description: 'alimento, medicamento, vacuna…',
  })
  @TextoSeguro('El tipo de insumo', 60)
  @IsOptional()
  tipo?: string;

  @ApiProperty({ example: 'kg', description: 'Unidad de medida' })
  @TextoSeguro('La unidad de medida', 30, { requerido: true })
  unidad_medida: string;

  @ApiPropertyOptional({ example: 100, description: 'Stock inicial' })
  @IsNumber()
  @Min(0)
  @Max(STOCK_MAXIMO)
  @IsOptional()
  stock_actual?: number;

  @ApiPropertyOptional({ example: 20, description: 'Umbral de reposición' })
  @IsNumber()
  @Min(0)
  @Max(STOCK_MAXIMO)
  @IsOptional()
  stock_minimo?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsNumber()
  @Min(0)
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  @IsOptional()
  precio_unitario_cop?: number;

  @ApiPropertyOptional({ example: 'Bodega A' })
  @TextoSeguro('La ubicación en almacén', 120)
  @IsOptional()
  ubicacion_almacen?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  fecha_vencimiento?: string;
}
