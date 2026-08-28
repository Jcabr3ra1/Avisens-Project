// dto/create-usuario-galpon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateUsuarioGalponDto {
  @ApiProperty({
    example: 1,
    description: 'ID del usuario a asignar al galpón',
  })
  @IsInt()
  @IsPositive()
  usuario_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID del galpón al que se asigna el usuario',
  })
  @IsInt()
  @IsPositive()
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'operario',
    description: 'Rol de asignación: operario | supervisor | encargado',
  })
  @IsString()
  @IsOptional()
  rol_asignacion?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo de la asignación',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
