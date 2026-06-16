import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EspressoBean } from './entities/espresso-bean.entity';
import { EspressoHistoryService } from './espresso-history.service';

const mockEspressoBeanRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('EspressoHistoryService', () => {
  let service: EspressoHistoryService;
  let repository: ReturnType<typeof mockEspressoBeanRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EspressoHistoryService,
        {
          provide: getRepositoryToken(EspressoBean),
          useFactory: mockEspressoBeanRepository,
        },
      ],
    }).compile();

    service = module.get<EspressoHistoryService>(EspressoHistoryService);
    repository = module.get(getRepositoryToken(EspressoBean));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('원두 목록을 logs와 rounds가 포함된 프론트 호환 shape으로 반환해야 함', async () => {
    const bean = createEspressoBeanEntity();
    repository.find.mockResolvedValue([bean]);

    const result = await service.getBeans();

    expect(repository.find).toHaveBeenCalledWith({
      relations: { histories: { rounds: true } },
      order: {
        createdAt: 'ASC',
        histories: {
          createdAt: 'ASC',
          rounds: { roundNumber: 'ASC' },
        },
      },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: bean.id,
        name: bean.name,
        roaster: bean.roaster,
        goals: bean.goals,
        defaultEquipment: bean.defaultEquipment,
        logs: [
          expect.objectContaining({
            id: bean.histories[0].id,
            type: 'espresso-log',
            title: bean.histories[0].title,
            currentAnalysis: bean.histories[0].currentAnalysis,
            adjustmentGuide: bean.histories[0].adjustmentGuide,
            finalHypothesis: bean.histories[0].finalHypothesis,
            nextTest: bean.histories[0].nextTest,
            nextDirection: bean.histories[0].nextDirection,
            rounds: [
              expect.objectContaining({
                id: bean.histories[0].rounds[0].id,
                roundNumber: bean.histories[0].rounds[0].roundNumber,
                date: bean.histories[0].rounds[0].date,
                recipe: bean.histories[0].rounds[0].recipe,
                result: bean.histories[0].rounds[0].result,
                analysis: bean.histories[0].rounds[0].analysis,
                nextActions: bean.histories[0].rounds[0].nextActions,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('id로 원두 상세를 조회해야 함', async () => {
    const bean = createEspressoBeanEntity();
    repository.findOne.mockResolvedValue(bean);

    const result = await service.getBeanById(bean.id);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: bean.id },
      relations: { histories: { rounds: true } },
      order: {
        histories: {
          createdAt: 'ASC',
          rounds: { roundNumber: 'ASC' },
        },
      },
    });
    expect(result.logs[0].rounds[0].roundNumber).toBe(1);
  });

  it('id에 해당하는 원두가 없으면 NotFoundException을 던져야 함', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getBeanById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});

function createEspressoBeanEntity(): EspressoBean {
  const createdAt = new Date('2026-06-10T00:00:00.000Z');

  return {
    id: 'bean-fritz-jal-doeeo-gasina',
    name: '프릳츠 잘 되어 가시나',
    roaster: '프릳츠',
    goals: ['단맛', '밸런스'],
    defaultEquipment: {
      machine: 'CRM 3605 PWM 2버전',
      basket: 'IMS 20g',
    },
    histories: [
      {
        id: 'log-home-espresso-001',
        beanId: 'bean-fritz-jal-doeeo-gasina',
        title: '홈카페 에스프레소 추출 로그',
        currentAnalysis: { conditions: ['도징 20g'] },
        adjustmentGuide: [
          { condition: '여전히 20초 이하', action: '분쇄도 조정' },
        ],
        finalHypothesis: ['채널링 가능성'],
        nextTest: {
          goals: ['산미 감소'],
          recipe: {},
          method: [],
          expectedResult: ['단맛 증가'],
        },
        nextDirection: ['추출시간 증가'],
        rounds: [
          {
            id: 'round-001',
            historyId: 'log-home-espresso-001',
            roundNumber: 1,
            date: null,
            recipe: { dose: { value: 19.5, unit: 'g' } },
            result: { taste: ['산미 강함'] },
            analysis: { judgments: ['저추출'] },
            nextActions: ['분쇄도 가늘게 조정'],
            createdAt,
            updatedAt: createdAt,
          },
        ],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}
