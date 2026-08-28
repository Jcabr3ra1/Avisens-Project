import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'maria@granja.com' })
  @IsEmail()
  email: string;
}
