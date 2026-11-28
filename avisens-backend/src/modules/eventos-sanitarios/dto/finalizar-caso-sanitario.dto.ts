import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class FinalizarCasoSanitarioDto {
  @ApiPropertyOptional({
    example: '2026-08-15T14:00:00.000Z',
    description: 'Fecha de cierre del caso sanitario (por defecto ahora)',
  })
  @IsOptional()
  @IsDateString()
  fecha_cierre?: string;

  @ApiPropertyOptional({
    example: 'Lote recuperado tras 5 días de tratamiento sin nuevas bajas.',
    description: 'Resumen o observaciones al finalizar el caso sanitario',
  })
  @IsOptional()
  @TextoSeguro('Las observaciones de cierre', 500, { multilinea: true })
  observaciones_cierre?: string;
}
