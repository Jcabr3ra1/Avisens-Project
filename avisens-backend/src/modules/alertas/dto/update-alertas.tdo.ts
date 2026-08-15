import {ApiProperty} from "@nestjs/swagger";
import {IsInt, IsNumber, IsString} from "class-validator";

export class UpdateAlertasDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty()
  @IsInt()
  nivel: number;
}