import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { InterpretarComandoVozDto } from './interpretar-comando-voz.dto';

export class SincronizarComandosVozDto {
  @ApiProperty({
    type: [InterpretarComandoVozDto],
    description:
      'Cada comando debe incluir un id_sincronizacion UUID generado en el dispositivo',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InterpretarComandoVozDto)
  comandos: InterpretarComandoVozDto[];
}
