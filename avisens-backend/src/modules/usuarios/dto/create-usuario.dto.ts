import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  nombre_completo: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  cedula: string;

  @ApiProperty({ example: 'maria@granja.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'contraseña123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ example: 2, description: 'ID del rol' })
  @IsInt()
  rol_id: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Organización existente. Solo la usa el Administrador; el Propietario asigna automáticamente la suya.',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  organizacion_id?: number;

  @ApiPropertyOptional({
    example: 'Avícola La Esperanza',
    description:
      'Nombre de la organización que se crea junto con un nuevo Propietario.',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  organizacion_nombre?: string;
}
