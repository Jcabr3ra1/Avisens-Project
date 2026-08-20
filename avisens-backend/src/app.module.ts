import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { GranjasModule } from './modules/granjas/granjas.module';
import { GalponesModule } from './modules/galpones/galpones.module';
import { HealthModule } from './modules/health/health.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DispositivosModule } from './modules/dispositivos/dispositivos.module';
import { SensoresModule } from './modules/sensores/sensores.module';
import { MedicionesModule } from './modules/mediciones/mediciones.module';
import { UmbralesModule } from './modules/umbrales/umbrales.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { InsumosModule } from './modules/insumos/insumos.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { PesajesModule } from './modules/pesajes/pesajes.module';
import { RegistrosMortalidadModule } from './modules/registros-mortalidad/registros-mortalidad.module';
import { EventosSanitariosModule } from './modules/eventos-sanitarios/eventos-sanitarios.module';
import { ConsumosDiariosModule } from './modules/consumos-diarios/consumos-diarios.module';
import { RegistrosPlagasModule } from './modules/registros-plagas/registros-plagas.module';
import { TiposAlimentoModule } from './modules/tipos-alimento/tipos-alimento.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { IndicadoresModule } from './modules/indicadores/indicadores.module';
import { CurvasObjetivoModule } from './modules/curvas-objetivo/curvas-objetivo.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ClimaModule } from './modules/clima/clima.module';
import { AlertasModule } from './modules/alertas/alertas.module';
import { PoliticasAlertaModule } from './modules/politicas-alertas/politicas-alerta.module';
import { AlertasCanalesModule } from './modules/alertas-canales/alertas-canales.module';
import { MovimientosFinancierosModule } from './modules/movimientos-financieros/movimientos-financieros.module';
import { PrediccionesModule } from './modules/predicciones/predicciones.module';
import { CopilotoModule } from './modules/copiloto/copiloto.module';
import { RecomendacionesModule } from './modules/recomendaciones/recomendaciones.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ProspectosModule } from './modules/prospectos/prospectos.module';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    GranjasModule,
    GalponesModule,
    DispositivosModule,
    SensoresModule,
    ProveedoresModule,
    InsumosModule,
    MedicionesModule,
    UmbralesModule,
    IngestModule,
    LotesModule,
    PesajesModule,
    RegistrosMortalidadModule,
    EventosSanitariosModule,
    ConsumosDiariosModule,
    RegistrosPlagasModule,
    TiposAlimentoModule,
    AuditoriaModule,
    IndicadoresModule,
    CurvasObjetivoModule,
    ClimaModule,
    AlertasModule,
    HealthModule,
    PoliticasAlertaModule,
    AlertasCanalesModule,
    MovimientosFinancierosModule,
    PrediccionesModule,
    RecomendacionesModule,
    CopilotoModule,
    ChatbotModule,
    ProspectosModule,
    CotizacionesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
