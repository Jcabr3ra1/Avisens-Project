import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarRecomendacionesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'abierta',
    description: 'Filtrar por estado: abierta | resuelta',
  })
  @IsIn(['abierta', 'resuelta'])
  @IsOptional()
  estado?: string;
}
