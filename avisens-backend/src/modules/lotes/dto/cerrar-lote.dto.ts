import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CerrarLoteDto {
  @ApiProperty({
    example: '2026-09-16',
    description: 'Fecha real de salida de las aves (AAAA-MM-DD)',
  })
  @IsDateString()
  fecha_salida_real: string;

  @ApiProperty({
    example: 4850,
    description: 'Cantidad total de aves vendidas al cierre del lote',
  })
  @IsInt()
  @Min(0)
  cantidad_aves_vendidas: number;

  @ApiProperty({
    example: 2650,
    description: 'Peso promedio final por ave al salir (en gramos)',
  })
  @IsNumber()
  @IsPositive()
  peso_promedio_final_g: number;

  @ApiPropertyOptional({
    example: 58000000,
    description:
      'Dinero total recibido por la venta del lote (COP). Si es mayor a 0 se registra automáticamente como ingreso en "Venta de aves".',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_venta_total_cop?: number;

  @ApiPropertyOptional({
    example: 4512.74,
    description:
      'Precio de venta por kilogramo (COP/kg). Si se omite y hay valor total y peso vendido, se calcula automáticamente.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precio_venta_kg_cop?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Confirma el cierre aunque existan días del ciclo sin registro de consumo de alimento.',
  })
  @IsOptional()
  @IsBoolean()
  confirmar_cierre?: boolean;
}
