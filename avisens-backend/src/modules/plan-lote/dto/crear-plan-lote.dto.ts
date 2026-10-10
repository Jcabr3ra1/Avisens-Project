import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CrearPlanLoteDto {
  @ApiProperty({ example: 2500, description: 'Peso objetivo comercial (g)' })
  @IsNumber()
  @IsPositive()
  peso_objetivo_g: number;

  @ApiPropertyOptional({
    example: 'Ajuste de objetivo solicitado por el cliente',
    description: 'Motivo de la creación o del cambio de objetivo',
  })
  @IsString()
  @IsOptional()
  motivo?: string;
}
