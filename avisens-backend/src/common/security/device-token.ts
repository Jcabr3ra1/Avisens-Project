import { createHash, randomBytes } from 'crypto';

export function generarDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
