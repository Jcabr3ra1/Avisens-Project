describe('WhatsappSender', () => {
  interface Sender {
    enviarTexto: (destino: string, texto: string) => Promise<boolean>;
  }

  const envOriginal = { ...process.env };

  // PROVEEDOR se lee al CARGAR el modulo, pero phoneId/token se leen en cada
  // llamada: por eso el entorno no se restaura hasta el afterEach.
  const cargarCon = (env: Record<string, string>): Sender => {
    Object.assign(process.env, env);
    let sender: Sender | undefined;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const modulo = require('./whatsapp.sender') as {
        WhatsappSender: new () => Sender;
      };
      sender = new modulo.WhatsappSender();
    });
    return sender!;
  };

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('en modo simulado no llama a Meta y da por enviado', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const sender = cargarCon({ WHATSAPP_PROVIDER: 'simulado' });
    const ok = await sender.enviarTexto('573001112233', 'hola');

    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con proveedor meta arma la peticion a la Graph API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const sender = cargarCon({
      WHATSAPP_PROVIDER: 'meta',
      WHATSAPP_API_VERSION: 'v25.0',
      WHATSAPP_PHONE_NUMBER_ID: '999',
      WHATSAPP_ACCESS_TOKEN: 'token-x',
    });
    const ok = await sender.enviarTexto('573001112233', 'hola');

    expect(ok).toBe(true);
    const [url, opciones] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string; signal?: AbortSignal },
    ];
    expect(url).toBe('https://graph.facebook.com/v25.0/999/messages');
    expect(opciones.headers.Authorization).toBe('Bearer token-x');
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(opciones.body)).toEqual({
      messaging_product: 'whatsapp',
      to: '573001112233',
      type: 'text',
      text: { preview_url: false, body: 'hola' },
    });
  });

  it('devuelve false cuando faltan las credenciales', async () => {
    global.fetch = jest.fn();

    const sender = cargarCon({
      WHATSAPP_PROVIDER: 'meta',
      WHATSAPP_PHONE_NUMBER_ID: '',
      WHATSAPP_ACCESS_TOKEN: '',
    });

    expect(await sender.enviarTexto('57300', 'hola')).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('devuelve false en vez de lanzar: quien decide reintentar es la cola', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

    const sender = cargarCon({
      WHATSAPP_PROVIDER: 'meta',
      WHATSAPP_PHONE_NUMBER_ID: '999',
      WHATSAPP_ACCESS_TOKEN: 'token-x',
    });

    await expect(sender.enviarTexto('57300', 'hola')).resolves.toBe(false);
  });

  it('devuelve false y registra el detalle cuando Meta responde con error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest
        .fn()
        .mockResolvedValue('{"error":{"message":"token caducado"}}'),
    });

    const sender = cargarCon({
      WHATSAPP_PROVIDER: 'meta',
      WHATSAPP_PHONE_NUMBER_ID: '999',
      WHATSAPP_ACCESS_TOKEN: 'viejo',
    });

    expect(await sender.enviarTexto('57300', 'hola')).toBe(false);
  });
});
