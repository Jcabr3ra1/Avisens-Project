import { Transform } from 'class-transformer';
import { NombreUsuario } from '../../../common/auth/username';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

// Reglas acordadas con QA (17-nov), iguales a las de la pantalla
// (validacionUsuario.ts): cédula colombiana de 6 a 10 dígitos y teléfono de
// al menos 10 dígitos, con «+57» opcional.
const CEDULA_VALIDA = /^\d{6,10}$/;
const TELEFONO_VALIDO = /^\+?\d{10,13}$/;

export class CreateUsuarioDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  nombre_completo: string;

  @ApiProperty({ example: '1098765432' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(CEDULA_VALIDA, {
    message: 'La cédula debe tener de 6 a 10 dígitos, solo números',
  })
  cedula: string;

  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiPropertyOptional({ example: 'maria@granja.com', nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsOptional()
  @IsEmail(
    {},
    { message: 'Escribe un correo válido, por ejemplo nombre@dominio.com' },
  )
  email?: string | null;

  @ApiProperty({ example: 'contraseña123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '3001234567' })
  // Espacios, guiones y paréntesis son formato: «300 123-4567» se guarda limpio.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s\-()]/g, '') || null : value,
  )
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_VALIDO, {
    message: 'El teléfono debe tener al menos 10 dígitos, solo números',
  })
  telefono?: string | null;

  @ApiProperty({ example: 2, description: 'ID del rol' })
  @IsInt()
  @Min(1)
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
