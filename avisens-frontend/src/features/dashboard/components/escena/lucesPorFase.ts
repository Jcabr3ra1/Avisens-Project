import type { FaseDelDia } from '../../model/escenaGalpon'

export type Luz = { cielo: number; suelo: number; ambiente: number; sol: number; fuerza: number; x: number; y: number; z: number }

export const LUCES: Record<FaseDelDia, Luz> = {
  dia: { cielo: 0xf2f6fb, suelo: 0xaebca0, ambiente: 1.15, sol: 0xffeccb, fuerza: 1.9, x: 14, y: 22, z: 12 },
  amanecer: { cielo: 0xfff0e6, suelo: 0xb9a99a, ambiente: 1, sol: 0xffc9a0, fuerza: 1.7, x: 22, y: 11, z: 8 },
  tarde: { cielo: 0xfff3e0, suelo: 0xb0a58a, ambiente: 0.95, sol: 0xffb878, fuerza: 1.9, x: -20, y: 12, z: 10 },
  noche: { cielo: 0x9fb4d8, suelo: 0x2f3f46, ambiente: 0.9, sol: 0xa9c0ee, fuerza: 0.95, x: -10, y: 20, z: 8 },
}
