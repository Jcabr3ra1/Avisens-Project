import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import { EstadoProspecto } from '@prisma/client';
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
    example: EstadoProspecto.calificado,
    enum: EstadoProspecto,
    description: 'Filtra por estado del prospecto',
  })
  @IsEnum(EstadoProspecto)
  @IsOptional()
  estado?: EstadoProspecto;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo los que todavia no tienen asesor asignado',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  sin_asignar?: boolean;
}
