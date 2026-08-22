import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AsignarAsesorDto {
  @ApiProperty({
    example: 1,
    description: 'Id del administrador que atendera al prospecto',
  })
  @IsInt()
  @IsPositive()
  asesor_id: number;

  @ApiProperty({
    example: 1,
    description: 'Alias de asesor_id para compatibilidad con admin',
  })
  @IsInt()
  @IsPositive()
  admin_id?: number;
}
