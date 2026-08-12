import { PartialType } from '@nestjs/swagger';
import { CreateCurvaObjetivoDto } from './create-curva-objetivo.dto';

export class UpdateCurvaObjetivoDto extends PartialType(
  CreateCurvaObjetivoDto,
) {}
