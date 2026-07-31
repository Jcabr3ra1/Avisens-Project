import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';

// BigInt no es serializable a JSON de forma nativa (JSON.stringify lo rechaza).
// Le enseñamos a emitirse como string: el id de mediciones es BigInt y JS no
// puede representar enteros tan grandes como number sin perder precisión.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());

  // Confía en 1 proxy delante (balanceador) para que req.ip sea la IP real
  // del cliente y el throttler limite por cliente, no por el proxy.
  app.set('trust proxy', 1);

  // Si CORS_ORIGIN no está definido, `true` refleja el origen de la petición
  // (permite cualquier origen con credenciales, cómodo en desarrollo).
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? true,
    credentials: true,
  });

  // Nest evalúa los filtros globales en orden inverso al registro: el último
  // registrado se prueba primero. Por eso el catch-all (@Catch()) va primero y
  // el específico de Prisma va de último, para que gane con los errores Pxxxx.
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // convierte el payload a instancias tipadas (y query -> número)
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Avisens API')
    .setDescription('API REST del sistema AVISENS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Escucha SIGTERM/SIGINT para apagarse ordenadamente: termina las peticiones
  // en curso y dispara OnModuleDestroy (Prisma cierra sus conexiones).
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Servidor corriendo en http://localhost:${port}`);
  logger.log(`Swagger en http://localhost:${port}/docs`);
}
void bootstrap();
