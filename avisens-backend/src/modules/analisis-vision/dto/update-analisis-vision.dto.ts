import { PartialType } from '@nestjs/swagger';
import { CreateAnalisisVisionDto } from './create-analisis-vision.dto';

export class UpdateAnalisisVisionDto extends PartialType(
  CreateAnalisisVisionDto,
) {}
