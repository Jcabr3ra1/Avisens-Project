import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateUsuarioGalponDto {
  @ApiProperty({ example: 1, description: 'ID del usuario a asignar' })
  @IsInt()
  usuario_id: number;

  @ApiProperty({ example: 1, description: 'ID del galpón' })
  @IsInt()
  galpon_id: number;

  @ApiPropertyOptional({ example: 'galponero', description: 'Rol en la asignación: galponero | supervisor | tecnico' })
  @IsString()
  @IsOptional()
  rol_asignacion?: string;
}

export class ListarUsuarioGalponDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por usuario' })
  @IsInt()
  @IsOptional()
  usuario_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por galpón' })
  @IsInt()
  @IsOptional()
  galpon_id?: number;

  @ApiPropertyOptional({ example: true, description: 'Solo asignaciones activas' })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
