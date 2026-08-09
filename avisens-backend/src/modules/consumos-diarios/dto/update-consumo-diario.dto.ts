import { PartialType } from '@nestjs/swagger';
import { CreateConsumoDiarioDto } from './create-consumo-diario.dto';

export class UpdateConsumoDiarioDto extends PartialType(
  CreateConsumoDiarioDto,
) {}
