import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { CreateUsuarioDto } from '../../modules/usuarios/dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../../modules/usuarios/dto/update-usuario.dto';
import { ConvertirProspectoDto } from '../../modules/prospectos/dto/convertir-prospecto.dto';
import { SolicitarRecuperacionDto } from '../../modules/recuperaciones-password/dto/solicitar-recuperacion.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const validar = (metatype: new () => object, datos: object) =>
  pipe.transform(datos, { type: 'body', metatype });
const cuenta = {
  nombre_completo: 'María López',
  cedula: '1098765432',
  username: ' MARIA.LOPEZ ',
  password: 'UnaClave123!',
  rol_id: 2,
};

describe('contrato de acceso por usuario', () => {
  it('normaliza usuario en ingreso, alta, edición, conversión y recuperación', async () => {
    for (const [tipo, datos] of [
      [LoginDto, { username: ' MARIA.LOPEZ ', password: 'UnaClave123!' }],
      [CreateUsuarioDto, cuenta],
      [UpdateUsuarioDto, { username: ' MARIA.LOPEZ ' }],
      [
        ConvertirProspectoDto,
        {
          nombre_completo: cuenta.nombre_completo,
          cedula: cuenta.cedula,
          username: cuenta.username,
          password: cuenta.password,
          granja_nombre: 'La Esperanza',
        },
      ],
      [SolicitarRecuperacionDto, { username: ' MARIA.LOPEZ ' }],
    ] as const) {
      await expect(validar(tipo, datos)).resolves.toMatchObject({
        username: 'maria.lopez',
      });
    }
  });

  it.each([
    '',
    'ab',
    'a'.repeat(31),
    'con espacio',
    'maría',
    'maria@gmail.com',
    '.maria',
    null,
    123,
  ])('rechaza un identificador inválido: %s', async (username) => {
    await expect(
      validar(LoginDto, { username, password: 'UnaClave123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza el contrato anterior de ingreso y recuperación por correo', async () => {
    await expect(
      validar(LoginDto, {
        email: 'maria@example.com',
        password: 'UnaClave123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validar(SolicitarRecuperacionDto, { email: 'maria@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite crear sin correo y borrar el contacto con null o texto vacío', async () => {
    await expect(validar(CreateUsuarioDto, cuenta)).resolves.toMatchObject({
      username: 'maria.lopez',
    });
    for (const email of [null, '', '   ']) {
      await expect(validar(UpdateUsuarioDto, { email })).resolves.toMatchObject(
        { email: null },
      );
    }
    await expect(
      validar(CreateUsuarioDto, { ...cuenta, email: ' CONTACTO@EJEMPLO.COM ' }),
    ).resolves.toMatchObject({ email: 'contacto@ejemplo.com' });
    await expect(
      validar(CreateUsuarioDto, { ...cuenta, email: 'no-es-correo' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige cédula de 6 a 10 dígitos y teléfono de al menos 10 (QA 17-nov)', async () => {
    for (const cedula of ['987654321@', 'CC1234567', '1.098.765', '123']) {
      await expect(
        validar(CreateUsuarioDto, { ...cuenta, cedula }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    for (const telefono of ['123', '300abc4567']) {
      await expect(
        validar(CreateUsuarioDto, { ...cuenta, telefono }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      validar(CreateUsuarioDto, { ...cuenta, telefono: '+57 300 123-4567' }),
    ).resolves.toMatchObject({ telefono: '+573001234567' });
    await expect(
      validar(UpdateUsuarioDto, { telefono: '' }),
    ).resolves.toMatchObject({ telefono: null });
  });

  it('responde en español cuando el correo no es válido', async () => {
    const error: unknown = await validar(CreateUsuarioDto, {
      ...cuenta,
      email: 'a@aa',
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      JSON.stringify((error as BadRequestException).getResponse()),
    ).toContain('Escribe un correo válido');
  });

  it('no permite borrar el usuario de acceso al editar', async () => {
    await expect(
      validar(UpdateUsuarioDto, { username: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validar(UpdateUsuarioDto, { username: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
