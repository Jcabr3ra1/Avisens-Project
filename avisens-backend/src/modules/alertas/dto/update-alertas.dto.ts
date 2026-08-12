// ============================================================================
// RETROALIMENTACION:
//  1. El archivo se llamaba 'update-alertas.tdo.ts' (typo: .tdo en vez de .dto).
//     Se renombro a 'update-alertas.dto.ts'.
//  2. Estaba vacio: se implementa con PartialType(CreateAlertasDto) para que
//     todos los campos del crear queden opcionales al actualizar.
//  3. Se agrega 'estado' porque una alerta tiene ciclo de vida
//     (abierta -> aceptada -> cerrada); ese cambio se hace al actualizar.
// ============================================================================
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateAlertasDto } from './create-alertas.dto';

export class UpdateAlertasDto extends PartialType(CreateAlertasDto) {
  @ApiPropertyOptional({
    example: 'aceptada',
    description: 'Estado de la alerta: abierta | aceptada | cerrada',
  })
  @IsString()
  @IsOptional()
  estado?: string;
}
