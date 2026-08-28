import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'operario@avisens.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Olvidé mi contraseña' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  motivo?: string;
}
