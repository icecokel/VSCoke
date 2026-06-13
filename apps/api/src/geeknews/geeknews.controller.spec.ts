import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GeekNewsController } from './geeknews.controller';
import { GeekNewsService } from './geeknews.service';

const mockGeekNewsService = () => ({
  syncLatestTopics: jest.fn(),
  getLatestArticles: jest.fn(),
  getArticleById: jest.fn(),
});

describe('GeekNewsController', () => {
  let controller: GeekNewsController;
  let service: ReturnType<typeof mockGeekNewsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeekNewsController],
      providers: [
        {
          provide: GeekNewsService,
          useFactory: mockGeekNewsService,
        },
      ],
    }).compile();

    controller = module.get<GeekNewsController>(GeekNewsController);
    service = module.get(GeekNewsService);
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  it('id로 긱뉴스 상세를 반환해야 함', async () => {
    const article = {
      id: '411b3333-a8b1-414b-bd60-9f538a885614',
      title: '원문 제목',
      content: '원문 본문',
      translatedTitle: 'Translated Title',
      translatedContent: 'Translated Content',
    };
    service.getArticleById.mockResolvedValue(article);

    const result = await controller.getArticleById(article.id);

    expect(service.getArticleById).toHaveBeenCalledWith(article.id);
    expect(result).toEqual(article);
  });

  it('상세 대상이 없으면 NotFoundException을 전파해야 함', async () => {
    service.getArticleById.mockRejectedValue(
      new NotFoundException('GeekNews article not found'),
    );

    await expect(
      controller.getArticleById('411b3333-a8b1-414b-bd60-9f538a885614'),
    ).rejects.toThrow(NotFoundException);
  });
});
