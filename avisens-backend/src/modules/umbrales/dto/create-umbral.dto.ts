import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';
import { VARIABLES_AMBIENTALES, CRITICIDADES } from '../umbral-constantes';
import { TextoSeguro } from '../../../common/validation/texto';

export class CreateUmbralDto {
  @ApiProperty({ example: 1, description: 'Galpón al que aplica el umbral' })
  @IsInt()
  @Min(1)
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
  @Max(200)
  semana_vida: number;

  @ApiProperty({ example: 30.0, description: 'Valor mínimo aceptable' })
  @IsNumber()
  @Min(-50)
  @Max(100_000)
  valor_minimo: number;

  @ApiProperty({ example: 33.0, description: 'Valor máximo aceptable' })
  @IsNumber()
  @Min(-50)
  @Max(100_000)
  valor_maximo: number;

  @ApiProperty({ example: '°C', description: 'Unidad de la variable' })
  @TextoSeguro('La unidad', 20, { requerido: true })
  unidad: string;

  @ApiProperty({ example: 'alta', enum: CRITICIDADES })
  @IsIn(CRITICIDADES)
  criticidad: string;
}
