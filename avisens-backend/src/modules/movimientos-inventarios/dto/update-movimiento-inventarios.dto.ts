// dto/update-movimiento-inventario.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateMovimientoInventarioDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del lote relacionado (opcional)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({
    example: 'kg',
    description: 'Unidad de medida (opcional)',
  })
  @IsString()
  @IsOptional()
  unidad_medida?: string;

  @ApiPropertyOptional({
    example: 'Consumo diario del lote #3 - corregido',
    description: 'Motivo del movimiento (actualizable)',
  })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({
    example: 'https://bucket.com/comprobante-corregido.pdf',
    description: 'URL del comprobante (factura, recibo, etc.)',
  })
  @IsUrl()
  @IsOptional()
  comprobante_url?: string;
}
