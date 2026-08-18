import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateMovimientoFinancieroDto {
  @ApiProperty({ example: 3, description: 'ID de la categoria financiera' })
  @IsInt()
  categoria_id: number;

  @ApiProperty({
    example: 'egreso',
    description: 'Tipo de movimiento: ingreso | egreso',
  })
  @IsIn(['ingreso', 'egreso'])
  tipo: string;

  @ApiProperty({ example: 1500000, description: 'Valor del movimiento en COP' })
  @IsNumber()
  @IsPositive()
  valor_cop: number;

  @ApiProperty({ example: '2026-08-18', description: 'Fecha del movimiento' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del lote asociado (para KPIs por lote)',
  })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del proveedor' })
  @IsInt()
  @IsOptional()
  proveedor_id?: number;

  @ApiPropertyOptional({
    example: 'Compra de alimento iniciacion',
    description: 'Descripcion del movimiento',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'FAC-0012',
    description: 'Numero de factura',
  })
  @IsString()
  @IsOptional()
  numero_factura?: string;

  @ApiPropertyOptional({
    example: 'transferencia',
    description: 'Metodo de pago',
  })
  @IsString()
  @IsOptional()
  metodo_pago?: string;
}
