import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateLineaGeneticaDto {
  @ApiProperty({
    example: 'Ross_308',
    description:
      'Código único de la línea genética. Se normaliza a minúsculas al guardar.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'codigo solo puede contener letras, números y guión bajo',
  })
  codigo: string;

  @ApiProperty({ example: 'Ross 308' })
  @NombreEntidad('El nombre de la línea genética', 120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Línea de engorde de Aviagen' })
  @IsOptional()
  @TextoSeguro('La descripción', 500, { multilinea: true })
  descripcion?: string;
}
