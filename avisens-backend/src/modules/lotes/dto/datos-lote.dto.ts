import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
} from '../../../common/avicultura/vocabulario';

export class DatosLoteDto {
  @ApiProperty({
    example: 1,
    description:
      'Línea genética del lote (Ross 308, Cobb 500…): define la curva estándar',
  })
  @IsInt()
  @Min(1)
  linea_genetica_id: number;

  @ApiProperty({ example: 'mixto', enum: SEXOS_LOTE })
  @IsIn(SEXOS_LOTE)
  sexo: string;

  @ApiProperty({ example: 'italcol', enum: MARCAS_ALIMENTO })
  @IsIn(MARCAS_ALIMENTO)
  marca_alimento: string;

  @ApiProperty({ example: 3, description: 'Proveedor de los pollitos' })
  @IsInt()
  @Min(1)
  proveedor_id: number;
}
