import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CrearEstimacionAlimentoDto {
  @ApiPropertyOptional({
    example: 'Recalculo tras registrar mortalidad de la semana',
    description: 'Motivo de esta versión de la estimación',
  })
  @IsString()
  @IsOptional()
  motivo?: string;
}
