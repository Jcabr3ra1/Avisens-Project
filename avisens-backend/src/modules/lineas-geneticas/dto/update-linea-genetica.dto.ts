import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLineaGeneticaDto {
  @ApiPropertyOptional({ example: 'Ross 308' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Línea de engorde de Aviagen' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
