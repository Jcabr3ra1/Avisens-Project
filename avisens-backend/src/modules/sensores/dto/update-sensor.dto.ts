import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSensorDto } from './create-sensor.dto';
import { EstadoSensor } from '@prisma/client';

export class UpdateSensorDto extends PartialType(CreateSensorDto) {
  @ApiPropertyOptional({
    example: EstadoSensor.mantenimiento,
    enum: EstadoSensor,
    description: 'Estado del sensor',
  })
  @IsEnum(EstadoSensor)
  @IsOptional()
  estado?: EstadoSensor;
}
