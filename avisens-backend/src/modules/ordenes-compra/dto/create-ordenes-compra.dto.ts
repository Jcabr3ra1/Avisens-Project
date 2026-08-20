import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateOrdenesCompraDto {
  @ApiProperty({ example: 1, description: 'ID del proveedor de la orden' })
  @IsInt()
  proveedor_id: number;

  @ApiProperty({
    example: 'OC-2026-001',
    description: 'Código único de la orden',
  })
  @IsString()
  codigo: string;

  @ApiProperty({
    example: 1,
    description: 'ID del usuario que registra la orden',
  })
  @IsInt()
  usuario_id: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del lote relacionado',
  })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({
    example: '2026-08-20',
    description: 'Fecha en que se realiza el pedido',
  })
  @IsDateString()
  @IsOptional()
  fecha_pedido?: string;

  @ApiPropertyOptional({
    example: '2026-08-27',
    description: 'Fecha prevista de entrega',
  })
  @IsDateString()
  @IsOptional()
  fecha_entrega_estimada?: string;

  @ApiPropertyOptional({
    example: '2026-08-26',
    description: 'Fecha efectiva de entrega',
  })
  @IsDateString()
  @IsOptional()
  fecha_entrega_real?: string;

  @ApiPropertyOptional({
    example: 1250000,
    description: 'Valor total de la orden en COP',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valor_total_cop?: number;

  @ApiPropertyOptional({
    example: 'pendiente',
    enum: ['pendiente', 'en_proceso', 'entregada', 'cancelada'],
    description: 'Estado actual de la orden',
  })
  @IsIn(['pendiente', 'en_proceso', 'entregada', 'cancelada'])
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    example: 4.5,
    description: 'Calificación del cumplimiento, de 0 a 5',
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  calificacion_cumplimiento?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Calificación de la calidad, de 0 a 5',
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  calificacion_calidad?: number;

  @ApiPropertyOptional({
    example: 3.5,
    description: 'Calificación del tiempo de entrega, de 0 a 5',
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  calificacion_tiempo?: number;
}
