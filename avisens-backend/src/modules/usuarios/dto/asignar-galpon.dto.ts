import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AsignarGalponDto {
  @ApiProperty({ example: 1, description: 'ID del galpón que se asigna' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'Responsable de alimentación',
    description: 'Función específica del operario dentro del galpón',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  rol_asignacion?: string;
}
