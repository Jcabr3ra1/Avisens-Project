import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { GranjasModule } from './modules/granjas/granjas.module';
import { GalponesModule } from './modules/galpones/galpones.module';
import { HealthModule } from './modules/health/health.module';
import { LegalModule } from './modules/legal/legal.module';
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
import { ChatModule } from './modules/chat/chat.module';
import { MensajesEquipoModule } from './modules/mensajes-equipo/mensajes-equipo.module';
import { PoliticasAlertaModule } from './modules/politicas-alertas/politicas-alerta.module';
import { AlertasCanalesModule } from './modules/alertas-canales/alertas-canales.module';
import { EvidenciaAlertaModule } from './modules/evidencia-alerta/evidencia-alerta.module';
import { AccionamientosEquiposModule } from './modules/accionamientos-equipos/accionamientos-equipos.module';
import { OrdenesCompraModule } from './modules/ordenes-compra/ordenes-compra.module';
import { MovimientosFinancierosModule } from './modules/movimientos-financieros/movimientos-financieros.module';
import { PrediccionesModule } from './modules/predicciones/predicciones.module';
import { CopilotoModule } from './modules/copiloto/copiloto.module';
import { RecomendacionesModule } from './modules/recomendaciones/recomendaciones.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ProspectosModule } from './modules/prospectos/prospectos.module';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { MantenimientoModule } from './modules/mantenimiento/mantenimiento.module';
import { SolicitudesPqrsModule } from './modules/solicitudes-pqrs/solicitudes-pqrs.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { InteraccionesChatbotModule } from './modules/interacciones-chatbot/interacciones-chatbot.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { OrganizacionesModule } from './modules/organizaciones/organizaciones.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DecimalInterceptor } from './common/decimal.interceptor';
import { RecuperacionesPasswordModule } from './modules/recuperaciones-password/recuperaciones-password.module';
import { CatalogoSensoresModule } from './modules/catalogo-sensores/catalogo-sensores.module';
import { ComandosVozModule } from './modules/comandos-voz/comandos-voz.module';
import { ZonasGalponModule } from './modules/zonas-galpon/zonas-galpon.module';
import { UsuariosGalponesModule } from './modules/usuarios-galpones/usuarios-galpones.module';
import { MovimientosInventarioModule } from './modules/movimientos-inventario/movimientos-inventario.module';
import { ModelosMlModule } from './modules/modelos-ml/modelos-ml.module';
import { AnalisisBioacusticoModule } from './modules/analisis-bioacustico/analisis-bioacustico.module';
import { AnalisisVisionModule } from './modules/analisis-vision/analisis-vision.module';
import { JobsModule } from './common/jobs/jobs.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { RequestObservabilityInterceptor } from './common/observability/request-observability.interceptor';
import { CaptacionProspectosModule } from './modules/captacion-prospectos/captacion-prospectos.module';
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
    BullModule.forRoot({
      connection: process.env.REDIS_URL
        ? { url: process.env.REDIS_URL }
        : {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
          },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    PrismaModule,
    JobsModule,
    ObservabilityModule,
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
    ChatModule,
    MensajesEquipoModule,
    HealthModule,
    LegalModule,
    PoliticasAlertaModule,
    AlertasCanalesModule,
    EvidenciaAlertaModule,
    AccionamientosEquiposModule,
    OrdenesCompraModule,
    MovimientosFinancierosModule,
    PrediccionesModule,
    RecomendacionesModule,
    CopilotoModule,
    ChatbotModule,
    ProspectosModule,
    CotizacionesModule,
    WhatsappModule,
    MantenimientoModule,
    SolicitudesPqrsModule,
    EquiposModule,
    InteraccionesChatbotModule,
    NotificacionesModule,
    OrganizacionesModule,
    RecuperacionesPasswordModule,
    CatalogoSensoresModule,
    ComandosVozModule,
    ZonasGalponModule,
    UsuariosGalponesModule,
    MovimientosInventarioModule,
    ModelosMlModule,
    AnalisisBioacusticoModule,
    AnalisisVisionModule,
    CaptacionProspectosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    { provide: APP_INTERCEPTOR, useClass: DecimalInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestObservabilityInterceptor,
    },
  ],
})
export class AppModule {}
