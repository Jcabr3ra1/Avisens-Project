import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class CerrarAlertaDto {
  @ApiPropertyOptional({
    example: 'Se ajustó la ventilación y se verificó la temperatura estable',
    description: 'Acción correctiva tomada para cerrar la alerta',
  })
  @IsOptional()
  @TextoSeguro('La acción correctiva', 500, { multilinea: true })
  accion_correctiva?: string;
}
