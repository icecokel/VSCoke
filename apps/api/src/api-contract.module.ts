import { ResumeConversationController } from './resume-rag/resume-conversation.controller';
import { ResumeConversationService } from './resume-rag/resume-conversation.service';
import { ResumeConversationRateLimitGuard } from './resume-rag/resume-conversation-rate-limit.guard';
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
import { MainChatController } from './main-chat/main-chat.controller';
import { MainChatRateLimitGuard } from './main-chat/main-chat-rate-limit.guard';
import { MainChatService } from './main-chat/main-chat.service';
import { RecipeController } from './recipe/recipe.controller';
import { RecipeService } from './recipe/recipe.service';
import { ResumeRagController } from './resume-rag/resume-rag.controller';
import { ResumeRagOriginGuard } from './resume-rag/resume-rag-origin.guard';
import { ResumeRagRateLimitGuard } from './resume-rag/resume-rag-rate-limit.guard';
import { ResumeRagService } from './resume-rag/resume-rag.service';
import { WordleController } from './wordle/wordle.controller';
import { WordleService } from './wordle/wordle.service';
import { BeatJevController } from './beat-jev/beat-jev.controller';
import { BeatJevService } from './beat-jev/beat-jev.service';
import { BeatJevRateLimitGuard } from './beat-jev/beat-jev-rate-limit.guard';
import { JevClientService } from './beat-jev/jev-client.service';
import {
  ClientErrorController,
  ClientErrorRateLimitGuard,
} from './common/logging/client-error.controller';

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
    MainChatController,
    RecipeController,
    ResumeRagController,
    ResumeConversationController,
    WordleController,
    BeatJevController,
    ClientErrorController,
  ],
  providers: [
    AppService,
    contractStubProvider(EspressoHistoryService),
    contractStubProvider(GameService),
    contractGuardStubProvider(MainChatRateLimitGuard),
    contractStubProvider(MainChatService),
    contractStubProvider(RecipeService),
    contractStubProvider(getRepositoryToken(User)),
    contractGuardStubProvider(GoogleAuthGuard),
    contractGuardStubProvider(ResumeRagOriginGuard),
    contractGuardStubProvider(ResumeRagRateLimitGuard),
    contractStubProvider(ResumeRagService),
    contractStubProvider(ResumeConversationService),
    contractGuardStubProvider(ResumeConversationRateLimitGuard),
    contractStubProvider(WordleService),
    contractStubProvider(BeatJevService),
    contractStubProvider(JevClientService),
    contractGuardStubProvider(BeatJevRateLimitGuard),
    contractGuardStubProvider(ClientErrorRateLimitGuard),
  ],
})
export class ApiContractModule {}
