import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNotificacionDto {
  @ApiProperty({ example: 1, description: 'ID del usuario destinatario' })
  @IsInt()
  usuario_id: number;

  @ApiProperty({ example: 'prospecto_caliente', description: 'Tipo: prospecto_caliente | pqrs_nueva | alerta_critica | sistema' })
  @IsString()
  tipo: string;

  @ApiProperty({ example: 'Nuevo prospecto caliente', description: 'Título de la notificación' })
  @IsString()
  titulo: string;

  @ApiProperty({ example: 'Pedro Ramirez tiene 16 puntos y fue clasificado como caliente.', description: 'Mensaje' })
  @IsString()
  mensaje: string;

  @ApiPropertyOptional({ example: 'prospecto', description: 'Tipo de entidad referenciada' })
  @IsString()
  @IsOptional()
  referencia_tipo?: string;

  @ApiPropertyOptional({ example: 14, description: 'ID de la entidad referenciada' })
  @IsInt()
  @IsOptional()
  referencia_id?: number;
}
