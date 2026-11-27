import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class AsignarGalponDto {
  @ApiProperty({ example: 1, description: 'ID del galpón que se asigna' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'Responsable de alimentación',
    description: 'Función específica del operario dentro del galpón',
  })
  @IsOptional()
  @TextoSeguro('La función asignada', 100)
  rol_asignacion?: string;
}
