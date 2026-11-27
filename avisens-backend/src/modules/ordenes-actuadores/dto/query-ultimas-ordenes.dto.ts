import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class QueryUltimasOrdenesDto {
  @ApiProperty({ example: 3, description: 'Galpón cuyos relés se consultan' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  galpon_id: number;
}
