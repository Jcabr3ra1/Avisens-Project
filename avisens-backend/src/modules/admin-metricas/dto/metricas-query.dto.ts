import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export const DIAS_PERMITIDOS = [7, 30, 90] as const;

export class MetricasQueryDto {
  @ApiPropertyOptional({
    enum: DIAS_PERMITIDOS,
    default: 30,
    description: 'Ventana en días: 7, 30 o 90',
  })
  @Type(() => Number)
  @IsIn(DIAS_PERMITIDOS, { message: 'dias debe ser 7, 30 o 90' })
  @IsOptional()
  dias: number = 30;
}
