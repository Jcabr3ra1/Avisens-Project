import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateMantenimientoRepuestoDto{
  @ApiProperty({
    example: 12,
    description: 'Id del mantenimiento al que pertenece el repuesto utilizado',
  })
  @IsInt()
  mantenimiento_id: number;

  @ApiProperty({
    example: 4,
    description: 'ID del insumo (repuesto) del inventario que fue utilizado',
  })
  @IsInt()
  insumo_id: number;

  @ApiPropertyOptional({
    example: 'Correa trapezoidal A-45',
    description: 'Descripción del repuesto utilizado',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Cantidad de unidades del repuesto utilizadas',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad?: number;

  @ApiPropertyOptional({
    example: 45000,
    description: 'Costo del repuesto en pesos colombianos (COP)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_cop?: number;
}