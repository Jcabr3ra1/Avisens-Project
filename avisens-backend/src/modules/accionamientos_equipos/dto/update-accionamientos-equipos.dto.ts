// dto/update-accionamiento-equipo.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

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
  @IsOptional()
  estado?: string;
}