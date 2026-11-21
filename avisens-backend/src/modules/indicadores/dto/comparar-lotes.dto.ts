import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CompararLotesDto {
  @ApiProperty({ example: 1, description: 'ID del primer lote a comparar' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lote1Id: number;

  @ApiProperty({ example: 2, description: 'ID del segundo lote a comparar' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lote2Id: number;
}
