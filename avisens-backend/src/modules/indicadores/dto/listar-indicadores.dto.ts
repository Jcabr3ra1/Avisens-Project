import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarIndicadoresDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Desde (inclusive)' })
  @IsDateString()
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-08-31', description: 'Hasta (inclusive)' })
  @IsDateString()
  @IsOptional()
  hasta?: string;
}
