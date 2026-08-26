import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateInsumoDto } from './create-insumo.dto';

export class UpdateInsumoDto extends PartialType(
  OmitType(CreateInsumoDto, ['stock_actual', 'granja_id'] as const),
) {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
