export interface ClienteConConfiguracion {
  $queryRaw: jest.Mock;
  $configurar: jest.Mock;
}

export const esConfiguracionDePresupuesto = (plantilla: unknown): boolean =>
  Array.isArray(plantilla) && plantilla.join('?').includes('set_config');

export function clienteDePrueba<T extends ClienteConConfiguracion>(base: T): T {
  return {
    ...base,
    $queryRaw: (
      plantilla: TemplateStringsArray,
      ...valores: unknown[]
    ): unknown =>
      esConfiguracionDePresupuesto(plantilla)
        ? (base.$configurar(plantilla, ...valores) as unknown)
        : (base.$queryRaw(plantilla, ...valores) as unknown),
  };
}

export function secuenciaDeLlamadas(
  ...mocks: Array<[string, jest.Mock]>
): string[] {
  return mocks
    .flatMap(([nombre, mock]) =>
      mock.mock.invocationCallOrder.map((orden) => [orden, nombre] as const),
    )
    .sort((a, b) => a[0] - b[0])
    .map(([, nombre]) => nombre);
}
