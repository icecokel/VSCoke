import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EspressoHistoryController } from './espresso-history.controller';
import { EspressoHistoryService } from './espresso-history.service';

const mockEspressoHistoryService = () => ({
  getBeans: jest.fn(),
  getBeanById: jest.fn(),
});

describe('EspressoHistoryController', () => {
  let controller: EspressoHistoryController;
  let service: ReturnType<typeof mockEspressoHistoryService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EspressoHistoryController],
      providers: [
        {
          provide: EspressoHistoryService,
          useFactory: mockEspressoHistoryService,
        },
      ],
    }).compile();

    controller = module.get<EspressoHistoryController>(
      EspressoHistoryController,
    );
    service = module.get(EspressoHistoryService);
  });

  it('원두 목록을 반환해야 함', async () => {
    const beans = [
      {
        id: 'bean-fritz-jal-doeeo-gasina',
        name: '프릳츠 잘 되어 가시나',
        roaster: '프릳츠',
        goals: ['단맛'],
        defaultEquipment: {},
        logs: [],
      },
    ];
    service.getBeans.mockResolvedValue(beans);

    const result = await controller.getBeans();

    expect(service.getBeans).toHaveBeenCalled();
    expect(result).toEqual(beans);
  });

  it('상세 대상이 없으면 NotFoundException을 전파해야 함', async () => {
    service.getBeanById.mockRejectedValue(
      new NotFoundException('Espresso bean not found'),
    );

    await expect(controller.getBeanById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
