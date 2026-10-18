import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DatosGranjaDto {
  @ApiProperty({ example: 'Vereda El Progreso km 4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  direccion: string;

  @ApiProperty({ example: 'Rionegro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipio: string;

  @ApiProperty({ example: 'Antioquia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departamento: string;
}
