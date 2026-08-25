import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimientoInventario } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';

export class RegistrarMovimientoDto {
  @ApiProperty({
    enum: TipoMovimientoInventario,
    example: 'entrada',
    description:
      'entrada suma al stock, salida resta, ajuste fija el stock al valor indicado',
  })
  @IsEnum(TipoMovimientoInventario)
  tipo_movimiento: TipoMovimientoInventario;

  @ApiProperty({
    example: 50.5,
    description:
      'En entrada y salida es cuanto se mueve; en ajuste es el stock real contado',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidad: number;

  @ApiPropertyOptional({ example: 'Compra a proveedor', description: 'Por que se movio' })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ example: 1, description: 'Lote que consume el insumo' })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 'https://ejemplo.com/factura.pdf' })
  @IsUrl()
  @IsOptional()
  comprobante_url?: string;
}
