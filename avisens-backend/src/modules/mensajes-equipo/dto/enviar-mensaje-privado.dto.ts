import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnviarMensajePrivadoDto {
  @ApiProperty({ example: '¿Puedes revisar el ventilador del lado norte?' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1)
  @MaxLength(2000)
  contenido: string;
}
