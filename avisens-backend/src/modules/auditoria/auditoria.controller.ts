import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { AuditoriaService } from './auditoria.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar la bitacora de auditoria paginada (solo Admin)',
  })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.auditoriaService.listar(paginacion);
  }
}
