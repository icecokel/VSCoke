import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RecipeResponseDto } from './dto/recipe-response.dto';
import { RecipeService } from './recipe.service';

@ApiTags('Recipe')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Get()
  @ApiOperation({ summary: '레시피 목록 조회' })
  @ApiOkResponse({
    description: '레시피 목록 조회 성공',
    type: [RecipeResponseDto],
  })
  async getRecipes(): Promise<RecipeResponseDto[]> {
    return this.recipeService.getRecipes();
  }

  @Get(':id')
  @ApiOperation({ summary: '레시피 상세 조회' })
  @ApiParam({
    name: 'id',
    description: '레시피 UUID',
    example: '411b3333-a8b1-414b-bd60-9f538a885614',
  })
  @ApiOkResponse({
    description: '레시피 상세 조회 성공',
    type: RecipeResponseDto,
  })
  @ApiBadRequestResponse({ description: '레시피 ID가 UUID 형식이 아님' })
  @ApiNotFoundResponse({ description: '해당 레시피가 존재하지 않음' })
  async getRecipeById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipeResponseDto> {
    return this.recipeService.getRecipeById(id);
  }
}
