import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';

const mockRecipeService = () => ({
  getRecipes: jest.fn(),
  getRecipeById: jest.fn(),
});

describe('RecipeController', () => {
  let controller: RecipeController;
  let service: ReturnType<typeof mockRecipeService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipeController],
      providers: [
        {
          provide: RecipeService,
          useFactory: mockRecipeService,
        },
      ],
    }).compile();

    controller = module.get<RecipeController>(RecipeController);
    service = module.get(RecipeService);
  });

  it('레시피 목록을 반환해야 함', async () => {
    const recipes = [
      {
        id: '411b3333-a8b1-414b-bd60-9f538a885614',
        name: '장각구이',
        tags: ['한식'],
        ingredients: ['장각 2'],
        recipe: ['굽는다.'],
        source: null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    ];
    service.getRecipes.mockResolvedValue(recipes);

    const result = await controller.getRecipes();

    expect(service.getRecipes).toHaveBeenCalled();
    expect(result).toEqual(recipes);
  });

  it('상세 대상이 없으면 NotFoundException을 전파해야 함', async () => {
    service.getRecipeById.mockRejectedValue(
      new NotFoundException('Recipe not found'),
    );

    await expect(
      controller.getRecipeById('411b3333-a8b1-414b-bd60-9f538a885614'),
    ).rejects.toThrow(NotFoundException);
  });
});
