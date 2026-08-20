export const COLA_WHATSAPP = 'whatsapp';

export interface TrabajoMensaje {
  destino: string;
  texto: string;
}

export interface MensajeEntrante {
  de: string;
  texto: string;
  wamid: string;
}
