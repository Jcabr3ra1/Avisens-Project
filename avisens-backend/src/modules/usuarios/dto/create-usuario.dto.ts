import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

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
}
