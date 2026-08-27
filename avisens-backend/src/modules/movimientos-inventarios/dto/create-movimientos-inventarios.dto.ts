import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
  IsUrl,
} from 'class-validator';

export class CreateMovimientoInventarioDto {
  @ApiProperty({
    example: 1,
    description: 'ID del insumo que se está moviendo',
  })
  @IsInt()
  @IsPositive()
  insumo_id: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del lote relacionado (opcional)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  lote_id?: number;

  @ApiProperty({
    example: 'salida',
    description: 'Tipo de movimiento: entrada | salida',
    enum: ['entrada', 'salida'],
  })
  @IsIn(['entrada', 'salida'])
  @IsString()
  tipo_movimiento: string;

  @ApiProperty({
    example: 100,
    description: 'Cantidad movida (en la unidad de medida del insumo)',
  })
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @ApiPropertyOptional({
    example: 'kg',
    description: 'Unidad de medida (opcional, si no se usa la del insumo)',
  })
  @IsString()
  @IsOptional()
  unidad_medida?: string;

  @ApiPropertyOptional({
    example: 'Consumo diario del lote #3',
    description: 'Motivo del movimiento',
  })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({
    example: 'https://bucket.com/comprobante-123.pdf',
    description: 'URL del comprobante (factura, recibo, etc.)',
  })
  @IsUrl()
  @IsOptional()
  comprobante_url?: string;
}
