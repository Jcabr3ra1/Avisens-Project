import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';
import { VARIABLES_AMBIENTALES, CRITICIDADES } from '../umbral-constantes';

export class CreateUmbralDto {
  @ApiProperty({ example: 1, description: 'Galpón al que aplica el umbral' })
  @IsInt()
  galpon_id: number;

  @ApiProperty({ example: 'temperatura', enum: VARIABLES_AMBIENTALES })
  @IsIn(VARIABLES_AMBIENTALES)
  variable: string;

  @ApiProperty({
    example: 1,
    description: 'Semana de vida del lote (0 = primera)',
  })
  @IsInt()
  @Min(0)
  semana_vida: number;

  @ApiProperty({ example: 30.0, description: 'Valor mínimo aceptable' })
  @IsNumber()
  valor_minimo: number;

  @ApiProperty({ example: 33.0, description: 'Valor máximo aceptable' })
  @IsNumber()
  valor_maximo: number;

  @ApiProperty({ example: '°C', description: 'Unidad de la variable' })
  @IsString()
  unidad: string;

  @ApiProperty({ example: 'alta', enum: CRITICIDADES })
  @IsIn(CRITICIDADES)
  criticidad: string;
}
