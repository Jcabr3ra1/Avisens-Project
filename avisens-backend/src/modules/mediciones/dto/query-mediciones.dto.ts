import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class QueryMedicionesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por sensor' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sensor_id?: number;

  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00Z',
    description: 'Desde (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-07-31T23:59:59Z',
    description: 'Hasta (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  hasta?: string;
}
