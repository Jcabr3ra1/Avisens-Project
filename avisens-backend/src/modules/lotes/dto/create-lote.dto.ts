import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
  VALOR_MAXIMO_MOVIMIENTO_COP,
} from '../../../common/avicultura/vocabulario';
import {
  AVES_MAXIMO_LOTE,
  NombreEntidad,
} from '../../../common/validation/texto';

export class CreateLoteDto {
  @ApiProperty({
    example: 1,
    description: 'ID del galpón al que pertenece el lote',
  })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({
    example: '2026-08-06',
    description: 'Fecha de ingreso de las aves',
  })
  @IsDateString()
  fecha_ingreso: string;

  @ApiProperty({
    example: 5000,
    description: 'Cantidad de aves que ingresaron',
  })
  @IsInt()
  @IsPositive()
  @Max(AVES_MAXIMO_LOTE)
  cantidad_inicial: number;

  @ApiPropertyOptional({ example: 'Ross 308', description: 'Raza de las aves' })
  @NombreEntidad('La raza', 80, false)
  @IsOptional()
  raza?: string;

  @ApiPropertyOptional({
    example: 'mixto',
    description: 'Sexo del lote: macho | hembra | mixto',
    enum: SEXOS_LOTE,
  })
  @IsIn(SEXOS_LOTE)
  @IsOptional()
  sexo?: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID de la línea genética del lote. null desvincula la línea asignada.',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  linea_genetica_id?: number | null;

  @ApiPropertyOptional({
    example: 'italcol',
    description:
      'Marca de alimento del lote. Sólo italcol y solla tienen curva sembrada: ' +
      'con las otras el lote sale sin referencia con la que compararse.',
    enum: MARCAS_ALIMENTO,
  })
  @IsIn(MARCAS_ALIMENTO)
  @IsOptional()
  marca_alimento?: string;

  @ApiPropertyOptional({
    example: 1200,
    description: 'Costo unitario de cada pollito (COP)',
  })
  @IsNumber()
  @IsPositive()
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  @IsOptional()
  costo_pollito_unitario?: number;

  @ApiPropertyOptional({
    example: 6000000,
    description: 'Presupuesto total del lote (COP)',
  })
  @IsNumber()
  @IsPositive()
  @Max(VALOR_MAXIMO_MOVIMIENTO_COP)
  @IsOptional()
  presupuesto_total_cop?: number;

  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Fecha estimada de salidad de las aves',
  })
  @IsDateString()
  @IsOptional()
  fecha_salida_estimada?: string;
}
