import { Test, TestingModule } from '@nestjs/testing';
import { LegalController } from './legal.controller';

describe('LegalController', () => {
  let controller: LegalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
    }).compile();
    controller = module.get<LegalController>(LegalController);
  });

  describe('politicaPrivacidad', () => {
    it('devuelve HTML con la politica de privacidad', () => {
      const r = controller.politicaPrivacidad();
      expect(r).toContain('<html');
      expect(r).toContain('privacidad');
    });
  });
});
