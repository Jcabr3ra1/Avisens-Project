import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SimularFaenaDto {
  @ApiProperty({ example: 42, description: 'Día de vida del lote que quieres simular' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  dia_faena!: number;
}
