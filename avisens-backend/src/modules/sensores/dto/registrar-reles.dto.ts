import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class RegistrarRelesDto {
  @ApiProperty({ example: 1, description: 'Galpón donde está el ESP32' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({
    example: 3,
    description: 'ESP32 (dispositivo) cuyos relés K1-K4 se registran',
  })
  @IsInt()
  @Min(1)
  dispositivo_id: number;
}
