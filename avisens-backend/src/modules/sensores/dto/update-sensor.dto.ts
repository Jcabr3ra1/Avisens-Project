import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CreateSensorDto } from './create-sensor.dto';
import { EstadoSensor } from '@prisma/client';

export class UpdateSensorDto extends PartialType(
  OmitType(CreateSensorDto, ['fecha_instalacion'] as const),
) {
  @ApiPropertyOptional({
    example: EstadoSensor.mantenimiento,
    enum: EstadoSensor,
    description: 'Estado del sensor',
  })
  @IsEnum(EstadoSensor)
  @IsOptional()
  estado?: EstadoSensor;

  // En edición, null borra la fecha (p. ej. se cargó por error). Omitirla la
  // deja como está.
  @ApiPropertyOptional({
    example: '2026-07-24',
    nullable: true,
    description: 'Fecha de instalación; null la borra',
  })
  @IsDateString()
  @IsOptional()
  fecha_instalacion?: string | null;
}
