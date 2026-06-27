import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

// Todos los campos opcionales: en una edición solo se envía lo que cambia.
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
  @ApiPropertyOptional({ example: true, description: 'Activar o desactivar la cuenta' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
