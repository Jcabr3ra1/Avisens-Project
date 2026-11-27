import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PESO_MAXIMO_POLLO_G } from '../../../common/avicultura/vocabulario';
import {
  DIA_CICLO_MAXIMO,
  FCR_MAXIMO,
} from '../../../common/validation/texto';

export class PuntoCurvaGeneticaDto {
  @ApiProperty({ example: 7, description: 'Día de vida (1 = primer día)' })
  @IsInt()
  @Min(1)
  @Max(DIA_CICLO_MAXIMO)
  dia: number;

  @ApiProperty({ example: 211, description: 'Peso esperado ese día (g)' })
  @IsNumber()
  @IsPositive()
  @Max(PESO_MAXIMO_POLLO_G)
  peso_esperado_g: number;

  @ApiPropertyOptional({
    example: 24,
    description: 'Consumo de alimento ese día (g/ave)',
  })
  @IsNumber()
  @Min(0)
  @Max(50_000)
  @IsOptional()
  consumo_diario_g?: number;

  @ApiPropertyOptional({
    example: 164,
    description: 'Consumo acumulado de alimento hasta ese día (g/ave)',
  })
  @IsNumber()
  @Min(0)
  @Max(50_000)
  @IsOptional()
  consumo_acumulado_g?: number;

  @ApiPropertyOptional({ example: 0.78, description: 'FCR objetivo acumulado' })
  @IsNumber()
  @IsPositive()
  @Max(FCR_MAXIMO)
  @IsOptional()
  fcr_objetivo?: number;
}

export class ReemplazarPuntosCurvaDto {
  @ApiProperty({
    type: [PuntoCurvaGeneticaDto],
    description:
      'Conjunto completo de puntos. Un arreglo vacío es válido: borra todos los puntos del borrador.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PuntoCurvaGeneticaDto)
  puntos: PuntoCurvaGeneticaDto[];
}
