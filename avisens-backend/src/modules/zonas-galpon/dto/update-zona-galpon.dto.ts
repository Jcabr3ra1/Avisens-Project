import { PartialType } from '@nestjs/swagger';
import { CreateZonaGalponDto } from './create-zona-galpon.dto';

export class UpdateZonaGalponDto extends PartialType(CreateZonaGalponDto) {}
