import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGalponDto } from './create-galpon.dto';

// Todos los campos opcionales: en una edición solo se envía lo que cambia.
export class UpdateGalponDto extends PartialType(CreateGalponDto) {
  @ApiPropertyOptional({ example: true, description: 'Activar o desactivar el galpón' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
