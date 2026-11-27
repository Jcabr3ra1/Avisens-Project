import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { VALOR_MAXIMO_MOVIMIENTO_COP } from '../../../common/avicultura/vocabulario';
import {
  CodigoAlfanumerico,
  STOCK_MAXIMO,
  TextoSeguro,
} from '../../../common/validation/texto';

export class AgregarRepuestoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  insumo_id: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(STOCK_MAXIMO)
  cantidad: number;

  @ApiProperty({ example: 'mant-31-correa-01' })
  @CodigoAlfanumerico('La clave de idempotencia', 100)
  clave_idempotencia: string;

  @ApiPropertyOptional({ example: 'Correa de transmisión' })
  @IsOptional()
  @TextoSeguro('La descripción', 500, { multilinea: true })
  descripcion?: string;

  @ApiPropertyOptional({ example: 85000, description: 'Costo total en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  @IsOptional()
  costo_cop?: number;
}
