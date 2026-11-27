export const COLA_WHATSAPP = 'whatsapp';

export interface OpcionInteractiva {
  id: string;
  titulo: string;
}

export interface ListaInteractiva {
  boton: string;
  filas: OpcionInteractiva[];
}

export interface TrabajoMensaje {
  destino: string;
  texto: string;
  botones?: OpcionInteractiva[];
  lista?: ListaInteractiva;
}

export interface MensajeEntrante {
  de: string;
  texto: string;
  wamid: string;
}
