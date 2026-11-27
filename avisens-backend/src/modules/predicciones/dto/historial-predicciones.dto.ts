import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export const TIPOS_PREDICCION = [
  'peso_faena',
  'mortalidad',
  'consumo',
  'fcr',
] as const;

export class HistorialPrediccionesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TIPOS_PREDICCION,
    description: 'Filtrar por la magnitud proyectada',
  })
  @IsIn(TIPOS_PREDICCION)
  @IsOptional()
  tipo?: string;
}
