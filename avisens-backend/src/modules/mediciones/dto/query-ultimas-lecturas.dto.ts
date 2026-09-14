import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class QueryUltimasLecturasDto {
  @ApiPropertyOptional({
    example: '3,7,11',
    description:
      'Galpones a consultar, separados por coma. Sin este filtro, se usan todos los galpones que el solicitante puede ver.',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.split(',').map(Number);
    if (Array.isArray(value)) return value.map(Number);
    return value;
  })
  @IsOptional()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  galpon_id?: number[];
}
