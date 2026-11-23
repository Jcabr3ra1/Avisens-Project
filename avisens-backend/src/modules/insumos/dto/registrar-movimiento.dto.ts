import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimientoInventario } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import {
  STOCK_MAXIMO,
  TextoSeguro,
  UrlHttpSegura,
} from '../../../common/validation/texto';

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
  @Max(STOCK_MAXIMO)
  cantidad: number;

  @ApiPropertyOptional({ example: 'Compra de insumo', description: 'Por que se movio' })
  @TextoSeguro('El motivo', 250)
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ example: 1, description: 'Lote que consume el insumo' })
  @IsInt()
  @Min(1)
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 'https://ejemplo.com/factura.pdf' })
  @UrlHttpSegura('El comprobante', 500)
  @IsOptional()
  comprobante_url?: string;
}
