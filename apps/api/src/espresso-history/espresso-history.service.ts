import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspressoBean } from './entities/espresso-bean.entity';
import { EspressoHistory } from './entities/espresso-history.entity';
import { EspressoRound } from './entities/espresso-round.entity';
import type {
  EspressoBeanRecord,
  EspressoLogRecord,
  EspressoRoundRecord,
} from './espresso-history.types';

const espressoBeanRelations = {
  histories: { rounds: true },
} as const;

@Injectable()
export class EspressoHistoryService {
  constructor(
    @InjectRepository(EspressoBean)
    private readonly espressoBeanRepository: Repository<EspressoBean>,
  ) {}

  async getBeans(): Promise<EspressoBeanRecord[]> {
    const beans = await this.espressoBeanRepository.find({
      relations: espressoBeanRelations,
      order: {
        createdAt: 'ASC',
        histories: {
          createdAt: 'ASC',
          rounds: { roundNumber: 'ASC' },
        },
      },
    });

    return beans.map((bean) => this.toBeanRecord(bean));
  }

  async getBeanById(id: string): Promise<EspressoBeanRecord> {
    const bean = await this.espressoBeanRepository.findOne({
      where: { id },
      relations: espressoBeanRelations,
      order: {
        histories: {
          createdAt: 'ASC',
          rounds: { roundNumber: 'ASC' },
        },
      },
    });

    if (!bean) {
      throw new NotFoundException('Espresso bean not found');
    }

    return this.toBeanRecord(bean);
  }

  private toBeanRecord(bean: EspressoBean): EspressoBeanRecord {
    return {
      id: bean.id,
      name: bean.name,
      roaster: bean.roaster ?? undefined,
      goals: bean.goals,
      defaultEquipment: bean.defaultEquipment,
      logs: (bean.histories ?? []).map((history) => this.toLogRecord(history)),
    };
  }

  private toLogRecord(history: EspressoHistory): EspressoLogRecord {
    return {
      id: history.id,
      type: 'espresso-log',
      title: history.title,
      rounds: (history.rounds ?? []).map((round) => this.toRoundRecord(round)),
      currentAnalysis: history.currentAnalysis ?? undefined,
      adjustmentGuide: history.adjustmentGuide ?? undefined,
      finalHypothesis: history.finalHypothesis ?? undefined,
      nextTest: history.nextTest ?? undefined,
      nextDirection: history.nextDirection ?? undefined,
    };
  }

  private toRoundRecord(round: EspressoRound): EspressoRoundRecord {
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      date: round.date,
      recipe: round.recipe,
      result: round.result,
      analysis: round.analysis ?? undefined,
      nextActions: round.nextActions,
    };
  }
}
