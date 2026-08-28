import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipoMovimientoInventario } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import { RegistrarMovimientoDto } from '../../insumos/dto/registrar-movimiento.dto';

export class CreateMovimientoInventarioDto extends RegistrarMovimientoDto {
  @ApiProperty({ example: 1, description: 'ID del insumo' })
  @IsInt()
  insumo_id: number;
}

export class ListarMovimientosInventarioDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por insumo' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  insumo_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por lote' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ enum: TipoMovimientoInventario })
  @IsEnum(TipoMovimientoInventario)
  @IsOptional()
  tipo_movimiento?: TipoMovimientoInventario;
}
