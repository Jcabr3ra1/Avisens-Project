import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AsignarAsesorDto {
  @ApiProperty({
    example: 1,
    description: 'Id del usuario que atendera al prospecto',
  })
  @IsInt()
  @IsPositive()
  asesor_id: number;
}
