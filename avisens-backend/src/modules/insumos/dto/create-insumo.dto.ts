import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInsumoDto {
  @ApiProperty({ example: 'Alimento iniciación' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({
    example: 'alimento',
    description: 'alimento, medicamento, vacuna…',
  })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({ example: 'kg', description: 'Unidad de medida' })
  @IsString()
  unidad_medida: string;

  @ApiPropertyOptional({ example: 100, description: 'Stock inicial' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_actual?: number;

  @ApiPropertyOptional({ example: 20, description: 'Umbral de reposición' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_minimo?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precio_unitario_cop?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del proveedor habitual' })
  @IsInt()
  @IsOptional()
  proveedor_habitual_id?: number;

  @ApiPropertyOptional({ example: 'Bodega A' })
  @IsString()
  @IsOptional()
  ubicacion_almacen?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  fecha_vencimiento?: string;
}
