import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsIn, IsString } from 'class-validator';
import { ESTADOS_ACCIONAMIENTO } from './create-accionamientos-equipos.dto';

export class UpdateAccionamientoEquipoDto {
  @ApiPropertyOptional({
    example: '2026-08-12T10:05:00Z',
    description: 'Fecha de fin del accionamiento (cierre del evento)',
  })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    example: 'apagado',
    description: 'Estado final del accionamiento: encendido | apagado',
  })
  @IsString()
  @IsIn(ESTADOS_ACCIONAMIENTO)
  @IsOptional()
  estado?: string;
}
