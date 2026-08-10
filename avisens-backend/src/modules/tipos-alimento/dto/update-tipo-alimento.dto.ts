import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTipoAlimentoDto } from './create-tipo-alimento.dto';

export class UpdateTipoAlimentoDto extends PartialType(CreateTipoAlimentoDto) {
  @ApiPropertyOptional({ example: true, description: 'Activo o inactivo' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
