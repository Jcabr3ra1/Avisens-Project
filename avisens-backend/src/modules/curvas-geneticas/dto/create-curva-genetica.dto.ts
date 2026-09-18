import { ApiProperty } from '@nestjs/swagger';
import { SexoCurva } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCurvaGeneticaDto {
  @ApiProperty({ example: 1, description: 'ID de la línea genética' })
  @IsInt()
  @Min(1)
  linea_genetica_id: number;

  @ApiProperty({ enum: SexoCurva, example: SexoCurva.macho })
  @IsEnum(SexoCurva)
  sexo: SexoCurva;

  @ApiProperty({
    example: 'aviagen-ross308-po-2022',
    description: 'Procedencia de esta versión de la curva',
  })
  @IsString()
  @IsNotEmpty()
  fuente: string;
}
