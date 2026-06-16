import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeService } from './recipe.service';

const mockRecipeRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('RecipeService', () => {
  let service: RecipeService;
  let repository: ReturnType<typeof mockRecipeRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeService,
        {
          provide: getRepositoryToken(Recipe),
          useFactory: mockRecipeRepository,
        },
      ],
    }).compile();

    service = module.get<RecipeService>(RecipeService);
    repository = module.get(getRepositoryToken(Recipe));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('저장된 레시피 목록을 프론트 호환 shape으로 반환해야 함', async () => {
    const recipe = createRecipeEntity();
    repository.find.mockResolvedValue([recipe]);

    const result = await service.getRecipes();

    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', name: 'ASC' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: recipe.id,
        name: recipe.name,
        tags: recipe.tags,
        ingredients: recipe.ingredients,
        recipe: recipe.steps,
        source: recipe.source,
      }),
    ]);
  });

  it('id로 저장된 레시피를 조회해야 함', async () => {
    const recipe = createRecipeEntity();
    repository.findOne.mockResolvedValue(recipe);

    const result = await service.getRecipeById(recipe.id);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: recipe.id },
    });
    expect(result.recipe).toEqual(recipe.steps);
  });

  it('id에 해당하는 레시피가 없으면 NotFoundException을 던져야 함', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getRecipeById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});

function createRecipeEntity(): Recipe {
  return {
    id: '411b3333-a8b1-414b-bd60-9f538a885614',
    name: '장각구이',
    tags: ['한식'],
    ingredients: ['장각 2', '소금 1'],
    steps: ['염지한다.', '굽는다.'],
    source: {
      type: 'notion',
      url: 'https://example.com',
    },
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}
