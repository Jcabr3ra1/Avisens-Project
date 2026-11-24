import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarInteraccionesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por prospecto' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  prospecto_id?: number;

  @ApiPropertyOptional({ example: '2026-08-01', description: 'Desde (inclusive)' })
  @IsDateString()
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-08-31', description: 'Hasta (inclusive)' })
  @IsDateString()
  @IsOptional()
  hasta?: string;
}
