import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ResponderChatDto {
  @ApiProperty({
    example: '3f8a1c22-0b5e-4a71-9f3d-6c2b8e1d4a90',
    description: 'Id de sesion devuelto al iniciar el chat',
  })
  @IsUUID()
  sesion_id: string;

  @ApiProperty({
    example: '5000-10000',
    description: 'Respuesta del prospecto a la pregunta actual',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  respuesta: string;
}
