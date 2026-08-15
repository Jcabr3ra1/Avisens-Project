import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class QueryCurvasObjetivoDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'italcol',
    description: 'Filtrar por marca de alimento',
  })
  @IsString()
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({
    example: 'macho',
    description: 'Filtrar por sexo: macho | hembra | mixto',
  })
  @IsIn(['macho', 'hembra', 'mixto'])
  @IsOptional()
  sexo?: string;
}
