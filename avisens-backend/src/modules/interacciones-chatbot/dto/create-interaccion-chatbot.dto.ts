import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInteraccionChatbotDto {
  @ApiProperty({ example: 1, description: 'ID del prospecto' })
  @IsInt()
  prospecto_id: number;

  @ApiPropertyOptional({ example: 'mensaje_entrante', description: 'Tipo: mensaje_entrante | respuesta_bot | opcion_seleccionada | timeout' })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiPropertyOptional({ example: '¿Cuantas aves manejas?', description: 'Mensaje enviado o recibido' })
  @IsString()
  @IsOptional()
  mensaje?: string;

  @ApiPropertyOptional({ example: 'seleccionar_opcion', description: 'Intent detectado por el NLU' })
  @IsString()
  @IsOptional()
  intent_detectado?: string;

  @ApiPropertyOptional({ example: 0.92, description: 'Confianza del NLU (0 a 1)' })
  @IsNumber()
  @IsOptional()
  confianza_nlu?: number;
}
