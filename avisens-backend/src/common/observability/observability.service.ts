import { Injectable } from '@nestjs/common';

@Injectable()
export class ObservabilityService {
  private readonly inicio = Date.now();
  private peticiones = 0;
  private errores = 0;
  private duracionTotalMs = 0;
  private ingestas = 0;
  private mediciones = 0;

  registrarPeticion(statusCode: number, duracionMs: number) {
    this.peticiones += 1;
    this.duracionTotalMs += duracionMs;
    if (statusCode >= 500) this.errores += 1;
  }

  registrarIngesta(cantidad: number) {
    this.ingestas += 1;
    this.mediciones += cantidad;
  }

  prometheus(): string {
    const lineas = [
      '# HELP avisens_uptime_seconds Tiempo activo del proceso.',
      '# TYPE avisens_uptime_seconds gauge',
      `avisens_uptime_seconds ${Math.floor((Date.now() - this.inicio) / 1000)}`,
      '# HELP avisens_http_requests_total Peticiones HTTP atendidas.',
      '# TYPE avisens_http_requests_total counter',
      `avisens_http_requests_total ${this.peticiones}`,
      '# HELP avisens_http_errors_total Respuestas HTTP 5xx.',
      '# TYPE avisens_http_errors_total counter',
      `avisens_http_errors_total ${this.errores}`,
      '# HELP avisens_http_duration_ms_total Duración HTTP acumulada.',
      '# TYPE avisens_http_duration_ms_total counter',
      `avisens_http_duration_ms_total ${this.duracionTotalMs}`,
      '# HELP avisens_iot_ingestas_total Lotes IoT aceptados.',
      '# TYPE avisens_iot_ingestas_total counter',
      `avisens_iot_ingestas_total ${this.ingestas}`,
      '# HELP avisens_iot_mediciones_total Mediciones IoT registradas.',
      '# TYPE avisens_iot_mediciones_total counter',
      `avisens_iot_mediciones_total ${this.mediciones}`,
    ];
    return `${lineas.join('\n')}\n`;
  }
}
