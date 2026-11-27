import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

export class EliminarProspectoDto {
  @ApiProperty({ example: 'ELIMINAR', enum: ['ELIMINAR'] })
  @IsString()
  @Equals('ELIMINAR', { message: 'Escribe ELIMINAR para confirmar.' })
  confirmacion: string;
}
