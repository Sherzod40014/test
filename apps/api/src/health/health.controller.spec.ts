import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports status ok with a version and timestamp', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
    expect(result.version).toBe('0.1.0');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
