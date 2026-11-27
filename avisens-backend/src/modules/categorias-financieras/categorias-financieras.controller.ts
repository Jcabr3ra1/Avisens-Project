import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLES } from '../../common/auth/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoriasFinancierasService } from './categorias-financieras.service';
import { ListarCategoriasFinancierasDto } from './dto/listar-categorias-financieras.dto';

// Sólo lectura: el catálogo se siembra, no se administra desde la aplicación.
// Los mismos roles que movimientos-financieros, porque quien no puede registrar
// un movimiento no necesita la lista con la que se clasifica.
@ApiTags('categorias-financieras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('categorias-financieras')
export class CategoriasFinancierasController {
  constructor(private servicio: CategoriasFinancierasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar categorías financieras paginadas (por defecto sólo activas)',
  })
  listar(@Query() query: ListarCategoriasFinancierasDto) {
    return this.servicio.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría financiera por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtener(id);
  }
}
