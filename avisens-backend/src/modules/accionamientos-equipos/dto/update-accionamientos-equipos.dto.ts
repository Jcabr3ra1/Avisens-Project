import { ApiPropertyOptional } from '@nestjs/swagger'; import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EstadoAccionamiento } from '@prisma/client';

export class UpdateAccionamientoEquipoDto {
  @ApiPropertyOptional({
    example: '2026-08-12T10:05:00Z',
    description: 'Fecha de fin del accionamiento (cierre del evento)',
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    example: EstadoAccionamiento.apagado,
    enum: EstadoAccionamiento,
    description: 'Estado final del accionamiento',
  })
  @IsEnum(EstadoAccionamiento)
  @IsOptional()
  estado?: EstadoAccionamiento;
}
