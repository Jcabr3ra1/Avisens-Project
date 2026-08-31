import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarMensajesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Solo los que aún no se han leído',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  sin_leer?: boolean;
}
