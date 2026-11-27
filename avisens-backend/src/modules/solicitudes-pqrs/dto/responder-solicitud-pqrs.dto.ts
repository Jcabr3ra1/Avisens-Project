import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class ResponderSolicitudPqrsDto {
  @ApiPropertyOptional({
    example: 'en_proceso',
    description: 'Nuevo estado: en_proceso | resuelta | cerrada',
  })
  @IsString()
  @IsIn(['en_proceso', 'resuelta', 'cerrada'])
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({
    example: 'Se contactó al prospecto y se envió la cotización por correo.',
    description: 'Respuesta registrada al cliente',
  })
  @IsOptional()
  @TextoSeguro('La respuesta', 4000, { multilinea: true })
  respuesta?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del administrador que toma la solicitud',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  responsable_id?: number;
}
