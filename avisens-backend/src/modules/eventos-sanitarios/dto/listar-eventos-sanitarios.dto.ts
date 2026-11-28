import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarEventosSanitariosDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID del lote' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lote_id?: number;

  @ApiPropertyOptional({
    enum: ['activo', 'finalizado'],
    description: 'Filtrar por estado del caso sanitario',
  })
  @IsOptional()
  @IsIn(['activo', 'finalizado'])
  estado?: 'activo' | 'finalizado';

  @ApiPropertyOptional({
    example: true,
    description: 'Si es true, lista solo casos principales (sin seguimientos)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  solo_casos?: boolean;
}
