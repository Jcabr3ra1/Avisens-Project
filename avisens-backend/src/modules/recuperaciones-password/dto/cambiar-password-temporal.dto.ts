import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordTemporalDto {
  @ApiProperty({ example: 'UnaContraseñaNueva123!' })
  @IsString()
  @MinLength(8)
  nueva_password: string;
}
