import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import { CATEGORIAS_PQRS, ESTADOS_PQRS } from '../dominio/pqrs';

export class ListarSolicitudesPqrsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'abierta',
    description: 'Filtrar por estado: abierta | en_proceso | resuelta | cerrada',
  })
  @IsString()
  @IsIn(ESTADOS_PQRS)
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    example: 'Queja',
    description: 'Filtrar por categoria',
  })
  @IsIn(CATEGORIAS_PQRS)
  @IsOptional()
  categoria?: string;
}
