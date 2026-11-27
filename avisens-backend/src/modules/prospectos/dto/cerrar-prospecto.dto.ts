import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export const RESULTADOS_CIERRE = ['ganado', 'perdido'] as const;

/**
 * Cerrar un prospecto sin crear un cliente.
 *
 * Para los dos casos que la conversión no cubre: se perdió —y el motivo es lo
 * que sirve para aprender por qué se caen— o se ganó pero la persona ya existía
 * en el sistema, y entonces se apunta a qué usuario.
 */
export class CerrarProspectoDto {
  @ApiProperty({ example: 'perdido', enum: RESULTADOS_CIERRE })
  @IsIn(RESULTADOS_CIERRE)
  resultado: string;

  @ApiPropertyOptional({
    example: 'El precio se salía de su presupuesto',
    description: 'Por qué se perdió. Es lo que se puede analizar después.',
  })
  @IsOptional()
  @TextoSeguro('El motivo', 300, { multilinea: true })
  motivo?: string;

  @ApiPropertyOptional({
    example: 12,
    description:
      'A qué cliente corresponde, cuando ya existía. Obligatorio si el resultado es ganado.',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  usuario_id?: number;
}
