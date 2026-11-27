import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CedulaColombiana,
  CodigoAlfanumerico,
  NitColombiano,
  NombreEntidad,
  NombrePersona,
  TelefonoColombiano,
  TextoSeguro,
  UrlHttpSegura,
} from './texto';

class DemoDto {
  @NombrePersona()
  persona!: string;

  @NombreEntidad('La granja')
  granja!: string;

  @TextoSeguro('Observaciones', 200, { multilinea: true })
  observaciones!: string;

  @CodigoAlfanumerico('Código')
  codigo!: string;

  @NitColombiano()
  nit!: string;

  @CedulaColombiana()
  cedula!: string;

  @TelefonoColombiano()
  telefono!: string;

  @UrlHttpSegura('La evidencia')
  url!: string;
}

describe('validadores compartidos de texto', () => {
  const base = {
    persona: 'María José Pérez',
    granja: 'Granja El Mirador #2 (Norte)',
    observaciones: 'Lote estable, temperatura 28°C.\nSin novedades.',
    codigo: 'GAL-001/A',
    nit: '900123456-7',
    cedula: '1020304050',
    telefono: '+57 300 123 4567',
    url: 'https://avisens.co/evidencias/foto.jpg',
  };

  it('acepta entradas válidas del dominio en español', async () => {
    const dto = plainToInstance(DemoDto, base);
    const errores = await validate(dto);
    expect(errores).toHaveLength(0);
    expect(dto.telefono).toBe('+573001234567');
  });

  it('rechaza etiquetas HTML, emojis y caracteres raros en textos', async () => {
    const dto = plainToInstance(DemoDto, {
      ...base,
      persona: 'Juan <script>alert(1)</script>',
      granja: '123456',
      observaciones: 'Falla grave <img src=x> 😀',
      codigo: 'MAL CÓDIGO!@#',
      nit: 'abc!@#',
      cedula: '12ab',
      telefono: '-------',
      url: 'javascript:alert(1)',
    });

    const errores = await validate(dto);
    const campos = errores.map((e) => e.property).sort();
    expect(campos).toEqual([
      'cedula',
      'codigo',
      'granja',
      'nit',
      'observaciones',
      'persona',
      'telefono',
      'url',
    ]);
  });
});
