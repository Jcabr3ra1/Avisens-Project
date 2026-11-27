import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive, Max } from 'class-validator';

export class GenerarCotizacionDto {
  @ApiPropertyOptional({
    example: 3,
    description:
      'Numero de galpones. Si no viene, se estima con el area de la granja',
  })
  @IsInt()
  @IsPositive()
  @Max(100)
  @IsOptional()
  numero_galpones?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Incluir tambien los sensores opcionales del catalogo',
  })
  @IsBoolean()
  @IsOptional()
  incluir_opcionales?: boolean;
}
