import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordTemporalDto {
  @ApiProperty({ example: 'UnaContraseñaNueva123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  nueva_password: string;
}
