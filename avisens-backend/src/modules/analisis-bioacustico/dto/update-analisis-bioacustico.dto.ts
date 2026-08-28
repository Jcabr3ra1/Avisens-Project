import { PartialType } from '@nestjs/swagger';
import { CreateAnalisisBioacusticoDto } from './create-analisis-bioacustico.dto';

export class UpdateAnalisisBioacusticoDto extends PartialType(
  CreateAnalisisBioacusticoDto,
) {}
