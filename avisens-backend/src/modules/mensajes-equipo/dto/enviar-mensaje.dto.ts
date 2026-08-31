import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class EnviarMensajeDto {
  @ApiProperty({ example: 1, description: 'Galpón sobre el que se conversa' })
  @IsInt()
  galpon_id: number;

  @ApiProperty({
    example: 'El ventilador 2 está haciendo ruido desde anoche',
    description: 'Texto del mensaje',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  // Un mensaje vacio no dice nada y el tope evita que alguien pegue un archivo
  // entero en el chat.
  @MinLength(1)
  @MaxLength(2000)
  contenido: string;
}
