import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import { TIPOS_CATEGORIA } from './tipos-categoria';

export class ListarCategoriasFinancierasDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'egreso',
    enum: TIPOS_CATEGORIA,
    description:
      'Filtra por tipo. Las categorías sin tipo no salen en ninguno de los dos: sirven para las dos cosas.',
  })
  @IsIn(TIPOS_CATEGORIA)
  @IsOptional()
  tipo?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Incluir sólo las activas. Con false salen todas.',
  })
  @Transform(({ value }: { value: unknown }) => value !== 'false' && value !== false)
  @IsBoolean()
  @IsOptional()
  solo_activas?: boolean;
}
