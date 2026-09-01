import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CrearConversacionPrivadaDto {
  @ApiProperty({ example: 4, description: 'Galpón que comparte la conversación' })
  @IsInt()
  galpon_id: number;

  @ApiProperty({ example: 8, description: 'Persona del equipo con quien se conversa' })
  @IsInt()
  destinatario_id: number;
}
