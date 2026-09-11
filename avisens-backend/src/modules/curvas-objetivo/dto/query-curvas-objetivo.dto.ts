import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
} from '../../../common/ganaderia/vocabulario';

export class QueryCurvasObjetivoDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'italcol',
    description: 'Filtrar por marca de alimento',
    enum: MARCAS_ALIMENTO,
  })
  @IsIn(MARCAS_ALIMENTO)
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({
    example: 'macho',
    description: 'Filtrar por sexo: macho | hembra | mixto',
  })
  @IsIn(SEXOS_LOTE)
  @IsOptional()
  sexo?: string;
}
