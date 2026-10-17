import { createHash } from 'crypto';

// Usuarios válidos y estables sin truncar los sufijos que aíslan cada ensayo.
export function usernameDePrueba(email: string): string {
  return `prueba.${createHash('sha256').update(email).digest('hex').slice(0, 20)}`;
}
