import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({ example: 'MiContraseñaActual1' })
  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña actual.' })
  @MaxLength(72)
  password_actual: string;

  @ApiProperty({ example: 'UnaContraseñaNueva123!' })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres.',
  })
  @MaxLength(72, {
    message: 'La nueva contraseña no puede superar 72 caracteres.',
  })
  nueva_password: string;
}
