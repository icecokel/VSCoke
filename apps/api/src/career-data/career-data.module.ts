import { Module } from '@nestjs/common';
import {
  CareerDataController,
  ResumeManagementController,
} from './career-data.controller';
import { CareerDataService } from './career-data.service';
import { CareerDataGuard } from './career-data.guard';
@Module({
  controllers: [CareerDataController, ResumeManagementController],
  providers: [CareerDataService, CareerDataGuard],
})
export class CareerDataModule {}
