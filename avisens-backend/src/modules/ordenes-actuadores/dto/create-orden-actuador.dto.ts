import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { AccionOrdenActuador } from '@prisma/client';

export class CreateOrdenActuadorDto {
  @ApiProperty({
    example: 12,
    description:
      'ID del sensor de estado del relé (REL-K1..K4) que se quiere accionar',
  })
  @IsInt()
  @IsPositive()
  sensor_id: number;

  @ApiProperty({
    enum: AccionOrdenActuador,
    example: AccionOrdenActuador.encender,
    description:
      'encender / apagar dejan el relé en modo manual; automatico lo devuelve a la lógica del ESP32',
  })
  @IsEnum(AccionOrdenActuador)
  accion: AccionOrdenActuador;
}
