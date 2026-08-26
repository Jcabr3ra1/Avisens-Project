import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

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
    description: 'Respuesta o nota del administrador',
  })
  @IsString()
  @IsOptional()
  respuesta?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del administrador que toma la solicitud',
  })
  @IsOptional()
  responsable_id?: number;
}
