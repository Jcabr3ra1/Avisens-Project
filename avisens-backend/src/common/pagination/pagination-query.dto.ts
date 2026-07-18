import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// DTO reutilizable para paginar cualquier listado. @Type convierte el query
// param (texto) a número; requiere transform: true en el ValidationPipe global.
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Número de página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Elementos por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // tope para que nadie pida 1 millón de filas de golpe
  @IsOptional()
  limit: number = 20;
}
