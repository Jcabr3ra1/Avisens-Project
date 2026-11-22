import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  @ApiPropertyOptional({
    description:
      'Contraseña temporal definida manualmente (si se omite, se genera una aleatoria segura).',
    minLength: 8,
    maxLength: 72,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'La contraseña temporal debe tener al menos 8 caracteres',
  })
  @MaxLength(72, {
    message: 'La contraseña temporal no puede superar 72 caracteres',
  })
  nueva_password?: string;

  @ApiPropertyOptional({
    description: 'Nota opcional sobre el motivo del restablecimiento.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  observacion?: string;
}
