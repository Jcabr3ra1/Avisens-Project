// dto/update-usuario-galpon.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateUsuarioGalponDto {
  @ApiPropertyOptional({
    example: 'supervisor',
    description: 'Rol de asignación: operario | supervisor | encargado',
  })
  @IsString()
  @IsOptional()
  rol_asignacion?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Estado activo/inactivo de la asignación',
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
