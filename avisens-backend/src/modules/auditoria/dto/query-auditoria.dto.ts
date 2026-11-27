import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class QueryAuditoriaDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'actualizar',
    description: 'Acción registrada',
  })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  accion?: string;

  @ApiPropertyOptional({ example: 'usuarios', description: 'Entidad afectada' })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  entidad?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Usuario que hizo el cambio',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  usuario_id?: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Desde esta fecha (inclusive)',
  })
  @IsISO8601({ strict: true }, { message: 'desde no es una fecha válida' })
  @Matches(FECHA, { message: 'desde debe tener el formato AAAA-MM-DD' })
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-17',
    description: 'Hasta esta fecha (inclusive)',
  })
  @IsISO8601({ strict: true }, { message: 'hasta no es una fecha válida' })
  @Matches(FECHA, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  @IsOptional()
  hasta?: string;
}
