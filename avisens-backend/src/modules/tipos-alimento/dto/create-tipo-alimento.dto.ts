import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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
    description: 'Etapa: iniciacion | engorde | finalizacion',
  })
  @IsString()
  @IsOptional()
  etapa?: string;

  @ApiPropertyOptional({
    example: 'migaja',
    description: 'Presentacion: harina | migaja | pellet',
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
