import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateLineaGeneticaDto {
  @ApiProperty({
    example: 'Ross_308',
    description:
      'Código único de la línea genética. Se normaliza a minúsculas al guardar.',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'codigo solo puede contener letras, números y guión bajo',
  })
  codigo: string;

  @ApiProperty({ example: 'Ross 308' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Línea de engorde de Aviagen' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
