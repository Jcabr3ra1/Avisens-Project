import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import {
  AVES_MAXIMO_LOTE,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateRegistroMortalidadDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  @Min(1)
  lote_id: number;

  @ApiProperty({ example: '2026-08-08', description: 'Fecha de la mortalidad' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 12, description: 'Cantidad de aves muertas' })
  @IsInt()
  @IsPositive()
  @Max(AVES_MAXIMO_LOTE, {
    message: `La cantidad de aves no puede superar ${AVES_MAXIMO_LOTE.toLocaleString('es-CO')}`,
  })
  cantidad_aves: number;

  @ApiPropertyOptional({
    example: 'Golpe de calor',
    description: 'Causa probable',
  })
  @IsOptional()
  @TextoSeguro('La causa probable', 150, { exigirLetras: true })
  causa_presuntiva?: string;

  @ApiPropertyOptional({
    example: 'Incineración',
    description: 'Qué se hizo con las aves',
  })
  @IsOptional()
  @TextoSeguro('La disposición', 100)
  disposicion?: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Cómo se registró' })
  @IsOptional()
  @TextoSeguro('El método de registro', 40)
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Concentradas en la esquina norte' })
  @IsOptional()
  @TextoSeguro('Las observaciones', 500, { multilinea: true })
  observaciones?: string;
}
