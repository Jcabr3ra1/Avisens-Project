import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarSolicitudesPqrsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'abierta',
    description: 'Filtrar por estado: abierta | en_proceso | resuelta | cerrada',
  })
  @IsString()
  @IsIn(['abierta', 'en_proceso', 'resuelta', 'cerrada'])
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    example: 'Queja',
    description: 'Filtrar por categoria',
  })
  @IsString()
  @IsOptional()
  categoria?: string;
}
