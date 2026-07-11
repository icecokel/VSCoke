import { InjectionToken, Module, Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleAuthGuard } from './auth/google-auth.guard';
import { User } from './auth/entities/user.entity';
import { EspressoHistoryController } from './espresso-history/espresso-history.controller';
import { EspressoHistoryService } from './espresso-history/espresso-history.service';
import { GameController } from './game/game.controller';
import { GameService } from './game/game.service';
import { PokeLoungeController } from './poke-lounge/poke-lounge.controller';
import { CompetitiveMatchService } from './poke-lounge/competitive/competitive-match.service';
import { PokeLoungeRoomService } from './poke-lounge/poke-lounge-room.service';
import { RecipeController } from './recipe/recipe.controller';
import { RecipeService } from './recipe/recipe.service';
import { ResumeRagController } from './resume-rag/resume-rag.controller';
import { ResumeRagOriginGuard } from './resume-rag/resume-rag-origin.guard';
import { ResumeRagService } from './resume-rag/resume-rag.service';
import { WordleController } from './wordle/wordle.controller';
import { WordleService } from './wordle/wordle.service';

const contractStubProvider = (provide: InjectionToken): Provider => ({
  provide,
  useValue: {},
});

const contractGuardStubProvider = (provide: InjectionToken): Provider => ({
  provide,
  useValue: {
    canActivate: () => true,
  },
});

@Module({
  controllers: [
    AppController,
    EspressoHistoryController,
    GameController,
    PokeLoungeController,
    RecipeController,
    ResumeRagController,
    WordleController,
  ],
  providers: [
    AppService,
    contractStubProvider(EspressoHistoryService),
    contractStubProvider(GameService),
    contractStubProvider(PokeLoungeRoomService),
    contractStubProvider(CompetitiveMatchService),
    contractStubProvider(RecipeService),
    contractStubProvider(getRepositoryToken(User)),
    contractGuardStubProvider(GoogleAuthGuard),
    contractGuardStubProvider(ResumeRagOriginGuard),
    contractStubProvider(ResumeRagService),
    contractStubProvider(WordleService),
  ],
})
export class ApiContractModule {}
