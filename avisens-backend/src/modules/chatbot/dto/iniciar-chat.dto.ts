import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class IniciarChatDto {
  @ApiPropertyOptional({
    example: 'web',
    description: 'Canal por el que llega el prospecto',
  })
  @IsString()
  @IsIn(['web', 'whatsapp'])
  @IsOptional()
  canal_origen?: string;

  @ApiPropertyOptional({
    example: 'cotizacion',
    enum: ['cotizacion', 'general', 'soporte'],
    description:
      'cotizacion: bloque A (califica al prospecto) · general: bloque B ' +
      '(preguntas frecuentes) · soporte: bloque S (PQRS de clientes)',
  })
  @IsString()
  @IsIn(['cotizacion', 'general', 'soporte'])
  @IsOptional()
  ruta?: string;
}
