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
    enum: ['cotizacion', 'general'],
    description:
      'Ruta del chat: cotizacion lleva al bloque A (calificacion) y general al bloque B (PQRS)',
  })
  @IsString()
  @IsIn(['cotizacion', 'general'])
  @IsOptional()
  ruta?: string;
}
