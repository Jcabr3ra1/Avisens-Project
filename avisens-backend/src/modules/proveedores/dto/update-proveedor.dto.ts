import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProveedorDto } from './create-proveedor.dto';

// Todos los campos opcionales: en una edición solo se envía lo que cambia.
export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Si el proveedor está activo',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
