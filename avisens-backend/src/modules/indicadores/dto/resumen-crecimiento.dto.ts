import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ResumenCrecimientoDto {
  @ApiPropertyOptional({ example: 4, description: 'Acota el resumen a una granja a la que tengas acceso' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  granjaId?: number;
}
