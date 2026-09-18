import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLineaGeneticaDto {
  @ApiPropertyOptional({ example: 'Ross 308' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Línea de engorde de Aviagen' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
