import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMovimientoInventarioDto {
  @ApiProperty({ example: 1, description: 'ID del insumo' })
  @IsInt()
  insumo_id: number;

  @ApiProperty({ example: 'entrada', description: 'Tipo: entrada | salida | ajuste' })
  @IsIn(['entrada', 'salida', 'ajuste'])
  tipo_movimiento: string;

  @ApiProperty({ example: 50.5, description: 'Cantidad del movimiento' })
  cantidad: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del lote asociado (salidas)' })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 'kg', description: 'Unidad de medida' })
  @IsString()
  @IsOptional()
  unidad_medida?: string;

  @ApiPropertyOptional({ example: 'Compra de alimento', description: 'Motivo del movimiento' })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del usuario que registra' })
  @IsInt()
  @IsOptional()
  usuario_id?: number;
}
