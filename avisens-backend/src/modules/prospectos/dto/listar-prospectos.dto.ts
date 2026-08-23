import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarProspectosDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'caliente',
    description: 'Filtra por clasificacion: caliente | tibio | frio',
  })
  @IsString()
  @IsIn(['caliente', 'tibio', 'frio', 'sin_consentimiento'])
  @IsOptional()
  clasificacion?: string;

  @ApiPropertyOptional({
    example: 'calificado',
    description: 'Filtra por estado: nuevo | en_proceso | calificado | cerrado',
  })
  @IsString()
  @IsIn([
    'nuevo',
    'en_proceso',
    'calificado',
    'asignado',
    'cerrado',
    'abandonado',
    'pqrs',
    'consulta_atendida',
    'sin_consentimiento',
  ])
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo los que todavia no tienen asesor asignado',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  sin_asignar?: boolean;
}
