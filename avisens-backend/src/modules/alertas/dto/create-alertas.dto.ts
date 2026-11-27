import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CRITICIDADES } from '../../../common/criticidad/criticidad';

export class CreateAlertasDto {
  @ApiProperty({
    example: 1,
    description: 'Id del galpon donde se genera la alerta',
  })
  @IsInt()
  galpon_id: number;

  @ApiProperty({
    example: 'temperatura_alta',
    description: 'Tipo de alerta que se disparo',
  })
  @IsString()
  tipo: string;

  @ApiProperty({ example: 'alta', enum: CRITICIDADES })
  @IsIn(CRITICIDADES)
  criticidad: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Id del lote relacionado',
  })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Id del sensor que disparo la alerta',
  })
  @IsInt()
  @IsOptional()
  sensor_id?: number;

  @ApiPropertyOptional({
    example: 34.5,
    description: 'Valor medido que disparo la alerta',
  })
  @IsNumber()
  @IsOptional()
  valor_detectado?: number;

  @ApiPropertyOptional({
    example: 32,
    description: 'Valor umbral configurado que se supero',
  })
  @IsNumber()
  @IsOptional()
  valor_umbral?: number;

  @ApiPropertyOptional({
    example: 'Temperatura por encima del umbral permitido',
    description: 'Mensaje descriptivo de la alerta',
  })
  @IsString()
  @IsOptional()
  mensaje?: string;
}
