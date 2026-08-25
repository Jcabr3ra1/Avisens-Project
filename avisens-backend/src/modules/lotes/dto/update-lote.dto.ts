import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CreateLoteDto } from './create-lote.dto';
import { EstadoLote } from '@prisma/client';

export class UpdateLoteDto extends PartialType(CreateLoteDto) {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Fecha real de salidad de las aves',
  })
  @IsDateString()
  @IsOptional()
  fecha_salida_real?: string;

  @ApiPropertyOptional({
    example: EstadoLote.finalizado,
    enum: EstadoLote,
    description: 'Estado del lote',
  })
  @IsEnum(EstadoLote)
  @IsOptional()
  estado?: EstadoLote;
}
