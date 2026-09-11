import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ETAPAS_ALIMENTACION } from '../../../common/ganaderia/vocabulario';

export class CreateTipoAlimentoDto {
  @ApiProperty({
    example: 'Iniciación Purina',
    description: 'Nombre del alimento',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Purina', description: 'Marca' })
  @IsString()
  @IsOptional()
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
  @IsString()
  @IsOptional()
  presentacion?: string;

  @ApiPropertyOptional({ example: 1, description: 'Dia de vida en que inicia' })
  @IsInt()
  @IsOptional()
  dia_inicio?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Dia de vida en que termina',
  })
  @IsInt()
  @IsOptional()
  dia_fin?: number;

  @ApiPropertyOptional({
    example: 900,
    description: 'Consumo total esperado por ave en gramos',
  })
  @IsNumber()
  @IsOptional()
  consumo_total_esperado_g?: number;
}
