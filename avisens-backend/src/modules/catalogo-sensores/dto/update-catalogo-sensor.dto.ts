import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCatalogoSensorDto } from './create-catalogo-sensor.dto';

export class UpdateCatalogoSensorDto extends PartialType(
  CreateCatalogoSensorDto,
) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
