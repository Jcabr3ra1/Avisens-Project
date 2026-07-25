import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import { VARIABLES_AMBIENTALES } from '../umbral-constantes';

export class QueryUmbralesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por galpón' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  galpon_id?: number;

  @ApiPropertyOptional({ enum: VARIABLES_AMBIENTALES })
  @IsIn(VARIABLES_AMBIENTALES)
  @IsOptional()
  variable?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Incluir versiones históricas (no vigentes)',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  incluir_historico?: boolean;
}
