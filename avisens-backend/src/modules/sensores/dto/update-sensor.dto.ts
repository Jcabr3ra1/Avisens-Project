import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateSensorDto } from './create-sensor.dto';
import { ESTADOS_SENSOR } from '../sensor-estados';
import type { EstadoSensor } from '../sensor-estados';

// Todos los campos opcionales: en una edición solo se envía lo que cambia.
export class UpdateSensorDto extends PartialType(CreateSensorDto) {
  @ApiPropertyOptional({
    example: 'mantenimiento',
    enum: ESTADOS_SENSOR,
    description: 'Estado del sensor',
  })
  @IsIn(ESTADOS_SENSOR)
  @IsOptional()
  estado?: EstadoSensor;
}
