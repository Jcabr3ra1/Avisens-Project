import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ETAPAS_ALIMENTACION } from '../../../common/avicultura/vocabulario';
import {
  DIA_CICLO_MAXIMO,
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

export class CreateTipoAlimentoDto {
  @ApiProperty({
    example: 'Iniciación Purina',
    description: 'Nombre del alimento',
  })
  @NombreEntidad('El nombre del alimento', 120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Purina', description: 'Marca' })
  @IsOptional()
  @NombreEntidad('La marca', 80, false)
  marca?: string;

  @ApiPropertyOptional({
    example: 'iniciacion',
    description:
      'Etapa de alimentación. Las mismas que usan las curvas objetivo, para ' +
      'poder cruzar el alimento que se dio con la curva que le tocaba.',
    enum: ETAPAS_ALIMENTACION,
  })
  @IsIn(ETAPAS_ALIMENTACION)
  @IsOptional()
  etapa?: string;

  @ApiPropertyOptional({
    example: 'migaja',
    description: 'Presentacion: harina | migaja | quebrantado | peletizado',
  })
  @IsOptional()
  @TextoSeguro('La presentación', 40)
  presentacion?: string;

  @ApiPropertyOptional({ example: 1, description: 'Dia de vida en que inicia' })
  @IsInt()
  @Min(0)
  @Max(DIA_CICLO_MAXIMO)
  @IsOptional()
  dia_inicio?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Dia de vida en que termina',
  })
  @IsInt()
  @Min(0)
  @Max(DIA_CICLO_MAXIMO)
  @IsOptional()
  dia_fin?: number;

  @ApiPropertyOptional({
    example: 900,
    description: 'Consumo total esperado por ave en gramos',
  })
  @IsNumber()
  @Min(0)
  @Max(50_000)
  @IsOptional()
  consumo_total_esperado_g?: number;
}
