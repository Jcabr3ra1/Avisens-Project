import { Injectable, Logger } from '@nestjs/common';

const HORAS_PRONOSTICO = 72;
const TIMEOUT_MS = 8000;

export interface HoraPronostico {
  hora: string;
  temperatura: number;
  humedad: number;
}

export interface UbicacionGranja {
  latitud: number | null;
  longitud: number | null;
  municipio: string | null;
  departamento: string | null;
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
  origen: 'granja' | 'municipio';
}

interface RespuestaGeocodificacion {
  results?: { latitude: number; longitude: number; admin1?: string }[];
}

interface RespuestaPronostico {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
  };
}

function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

@Injectable()
export class PronosticoClimaService {
  private readonly logger = new Logger(PronosticoClimaService.name);

  async coordenadas(granja: UbicacionGranja): Promise<Coordenadas | null> {
    if (granja.latitud != null && granja.longitud != null) {
      return {
        latitud: granja.latitud,
        longitud: granja.longitud,
        origen: 'granja',
      };
    }
    if (!granja.municipio) return null;

    const url =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(granja.municipio)}` +
      `&count=10&language=es&countryCode=CO`;
    const datos = await this.pedir<RespuestaGeocodificacion>(url);
    const resultados = datos?.results ?? [];
    const departamento = granja.departamento
      ? sinTildes(granja.departamento)
      : null;
    const elegido =
      resultados.find(
        (r) => departamento && r.admin1 && sinTildes(r.admin1) === departamento,
      ) ?? resultados[0];
    if (!elegido) return null;
    return {
      latitud: elegido.latitude,
      longitud: elegido.longitude,
      origen: 'municipio',
    };
  }

  async proximasHoras(latitud: number, longitud: number) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitud}&longitude=${longitud}` +
      `&hourly=temperature_2m,relative_humidity_2m` +
      `&forecast_hours=${HORAS_PRONOSTICO}&timezone=America%2FBogota`;
    const datos = await this.pedir<RespuestaPronostico>(url);
    const horario = datos?.hourly;
    if (!horario) return null;

    const horas: HoraPronostico[] = [];
    horario.time.forEach((hora, i) => {
      const temperatura = horario.temperature_2m[i];
      const humedad = horario.relative_humidity_2m[i];
      if (temperatura == null || humedad == null) return;
      horas.push({ hora, temperatura, humedad });
    });
    return horas.length > 0 ? horas : null;
  }

  private async pedir<T>(url: string): Promise<T | null> {
    try {
      const respuesta = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!respuesta.ok) {
        this.logger.warn(`Open-Meteo respondio ${respuesta.status}`);
        return null;
      }
      return (await respuesta.json()) as T;
    } catch {
      this.logger.warn('Open-Meteo no respondio');
      return null;
    }
  }
}
