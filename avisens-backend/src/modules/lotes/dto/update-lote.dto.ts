import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateLoteDto } from './create-lote.dto';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class UpdateLoteDto extends PartialType(CreateLoteDto) {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Fecha real de salidad de las aves',
  })
  @IsDateString()
  @IsOptional()
  fecha_salida_real?: string;

  @ApiPropertyOptional({
    example: 'finalizado',
    description: 'Estado del lote (activo, finalizado, inactivo)',
  })
  @IsIn(['activo', 'finalizado', 'inactivo'])
  @IsOptional()
  estado?: string;
}
