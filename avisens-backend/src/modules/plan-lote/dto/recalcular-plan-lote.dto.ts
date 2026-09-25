import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RecalcularPlanLoteDto {
  @ApiPropertyOptional({
    example: 'Línea genética actualizada tras corregir el ingreso',
    description: 'Motivo del recálculo',
  })
  @IsString()
  @IsOptional()
  motivo?: string;
}
