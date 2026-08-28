import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  @ApiProperty({ example: 'maria@granja.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Token de recuperación enviado al usuario',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'nuevaContraseña123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
