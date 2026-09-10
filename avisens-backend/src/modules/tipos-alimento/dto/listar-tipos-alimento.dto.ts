import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListarTiposAlimentoDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'italcol',
    description: 'Filtra por marca de alimento',
  })
  @IsString()
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Incluir sólo los activos. Con false salen todos, que es lo que necesita la pantalla de catálogos para reactivar uno.',
  })
  @Transform(
    ({ value }: { value: unknown }) => value !== 'false' && value !== false,
  )
  @IsBoolean()
  @IsOptional()
  solo_activos?: boolean;
}
