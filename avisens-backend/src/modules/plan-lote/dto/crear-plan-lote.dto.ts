import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Max } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class CrearPlanLoteDto {
  @ApiProperty({ example: 2500, description: 'Peso objetivo comercial (g)' })
  @IsNumber()
  @IsPositive()
  @Max(100_000, {
    message: 'El peso objetivo no puede superar 100.000 g por ave',
  })
  peso_objetivo_g: number;

  @ApiPropertyOptional({
    example: 'Ajuste de objetivo solicitado por el cliente',
    description: 'Motivo de la creación o del cambio de objetivo',
  })
  @IsOptional()
  @TextoSeguro('El motivo', 300, { multilinea: true })
  motivo?: string;
}
