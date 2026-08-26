import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateDetalleOrdenDto {
  @ApiProperty({ example: 1, description: 'Insumo de la misma granja' })
  @IsInt()
  @Min(1)
  insumo_id: number;

  @ApiProperty({ example: 50.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidad: number;

  @ApiProperty({ example: 85000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_unitario_cop: number;
}
