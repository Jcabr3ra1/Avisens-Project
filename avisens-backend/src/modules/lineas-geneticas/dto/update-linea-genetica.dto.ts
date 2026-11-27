import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLineaGeneticaDto } from './create-linea-genetica.dto';

export class UpdateLineaGeneticaDto extends PartialType(
  OmitType(CreateLineaGeneticaDto, ['codigo'] as const),
) {}
