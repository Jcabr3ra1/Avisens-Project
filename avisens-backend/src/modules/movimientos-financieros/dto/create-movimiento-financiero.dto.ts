import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { VALOR_MAXIMO_MOVIMIENTO_COP } from '../../../common/avicultura/vocabulario';

export class CreateMovimientoFinancieroDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'ID de la granja. Es obligatorio cuando no se envia lote_id; con lote se infiere y, si se envia, debe coincidir.',
  })
  @IsInt()
  @IsOptional()
  granja_id?: number;

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
  @IsPositive({ message: 'El monto debe ser mayor que cero' })
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP, {
    message:
      'Ingrese un monto razonable: el máximo por movimiento es $10.000.000.000. Revisa si sobran dígitos',
  })
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
