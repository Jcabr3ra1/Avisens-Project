import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { PESO_MAXIMO_POLLO_G } from '../../../common/avicultura/vocabulario';
import {
  AVES_MAXIMO_LOTE,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreatePesajeDto {
  @ApiProperty({ example: 1, description: 'ID del lote pesado' })
  @IsInt()
  @Min(1)
  lote_id: number;

  @ApiProperty({ example: '2026-08-08', description: 'Fecha del pesaje' })
  @IsDateString()
  fecha: string;

  @ApiProperty({
    example: 1850,
    description: 'Peso promedio de las aves (g). Máximo 10.000 g',
  })
  @IsNumber()
  @IsPositive()
  @Max(PESO_MAXIMO_POLLO_G, {
    message:
      'El peso promedio no puede superar 10.000 g por ave; revisa si escribiste kilos o un cero de más',
  })
  peso_promedio_g: number;

  @ApiPropertyOptional({ example: 50, description: 'Cuantas aves se pesaron' })
  @IsInt()
  @IsPositive()
  @Max(AVES_MAXIMO_LOTE, {
    message: `La muestra no puede superar ${AVES_MAXIMO_LOTE.toLocaleString('es-CO')} aves`,
  })
  @IsOptional()
  cantidad_aves_pesadas?: number;

  @ApiPropertyOptional({
    example: 1600,
    description: 'Peso del ave mas liviana(g)',
  })
  @IsNumber()
  @IsPositive()
  @Max(PESO_MAXIMO_POLLO_G)
  @IsOptional()
  peso_minimo_g?: number;

  @ApiPropertyOptional({
    example: 2100,
    description: 'Peso del ave más pesada (g)',
  })
  @IsNumber()
  @IsPositive()
  @Max(PESO_MAXIMO_POLLO_G)
  @IsOptional()
  peso_maximo_g?: number;

  @ApiPropertyOptional({
    example: 1900,
    description: 'Peso esperado según la raza (g)',
  })
  @IsNumber()
  @IsPositive()
  @Max(PESO_MAXIMO_POLLO_G)
  @IsOptional()
  peso_objetivo_g?: number;

  @ApiPropertyOptional({
    example: 'manual',
    description: 'Cómo se registró (manual, voz)',
  })
  @IsOptional()
  @TextoSeguro('El método de registro', 40)
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Lote parejo, buen crecimiento' })
  @IsOptional()
  @TextoSeguro('Las observaciones', 500, { multilinea: true })
  observaciones?: string;
}
