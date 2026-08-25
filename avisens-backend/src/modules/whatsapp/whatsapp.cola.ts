import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappSender } from './whatsapp.sender';
import { WhatsappService } from './whatsapp.service';
import {
  COLA_WHATSAPP,
  MensajeEntrante,
  TrabajoMensaje,
} from './whatsapp.tipos';

@Processor(COLA_WHATSAPP)
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private sender: WhatsappSender,
    private whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<TrabajoMensaje | MensajeEntrante>): Promise<void> {
    if (job.name === 'entrante') {
      await this.whatsappService.responder(job.data as MensajeEntrante);
      return;
    }

    const trabajo = job.data as TrabajoMensaje;
    const enviado = await this.sender.enviar(trabajo);
    if (!enviado) {
      throw new Error(`Envio fallido a ${trabajo.destino}`);
    }
    this.logger.log(`Mensaje ${job.id} entregado a ${trabajo.destino}`);
  }
}
