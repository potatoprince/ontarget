import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { UserSummary } from '../entities/user-summary.entity';
import { TransactionApiService } from './transaction-api.service';
import { UserSummaryDto, PayoutSummaryDto } from '../dto/transaction.dto';

interface PayoutSummaryRaw {
  userId: string;
  payoutAmount: number;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private lastSyncTimestamp: Date = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start from 24 hours ago

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(UserSummary)
    private readonly userSummaryRepository: Repository<UserSummary>,
    private readonly transactionApiService: TransactionApiService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncTransactions(): Promise<void> {
    this.logger.debug('Starting transaction sync...');

    try {
      const endDate = new Date();
      const startDate = this.lastSyncTimestamp;

      const response = await this.transactionApiService.getTransactions(
        startDate.toISOString(),
        endDate.toISOString(),
      );

      if (response.items.length === 0) {
        this.logger.debug('No new transactions to sync');
        return;
      }

      // Save new transactions
      const savedTransactions: Transaction[] = [];
      for (const transactionDto of response.items) {
        const existingTransaction = await this.transactionRepository.findOne({
          where: { id: transactionDto.id },
        });

        if (!existingTransaction) {
          const transaction = this.transactionRepository.create({
            id: transactionDto.id,
            userId: transactionDto.userId,
            createdAt: new Date(transactionDto.createdAt),
            type: transactionDto.type as TransactionType,
            amount: transactionDto.amount,
          });

          await this.transactionRepository.save(transaction);
          savedTransactions.push(transaction);
        }
      }

      if (savedTransactions.length > 0) {
        this.logger.debug(`Saved ${savedTransactions.length} new transactions`);
        await this.updateSummaries(savedTransactions);
      }

      this.lastSyncTimestamp = endDate;
    } catch (error) {
      this.logger.error('Failed to sync transactions', error);
    }
  }

  private async updateSummaries(transactions: Transaction[]): Promise<void> {
    const userIds = [...new Set(transactions.map((t) => t.userId))];

    for (const userId of userIds) {
      await this.recalculateUserSummary(userId);
    }
  }

  private async recalculateUserSummary(userId: string): Promise<void> {
    const transactions = await this.transactionRepository.find({
      where: { userId },
    });

    let earned = 0;
    let spent = 0;
    let payout = 0;
    let paidOut = 0;

    for (const transaction of transactions) {
      switch (transaction.type) {
        case TransactionType.EARNED:
          earned += Number(transaction.amount);
          break;
        case TransactionType.SPENT:
          spent += Number(transaction.amount);
          break;
        case TransactionType.PAYOUT:
          payout += Number(transaction.amount);
          // For this MVP, we assume payout requests are immediately paid out
          paidOut += Number(transaction.amount);
          break;
      }
    }

    const balance = earned - spent - paidOut;

    let userSummary = await this.userSummaryRepository.findOne({
      where: { userId },
    });

    if (!userSummary) {
      userSummary = this.userSummaryRepository.create({ userId });
    }

    userSummary.earned = earned;
    userSummary.spent = spent;
    userSummary.payout = payout;
    userSummary.paidOut = paidOut;
    userSummary.balance = balance;

    await this.userSummaryRepository.save(userSummary);
    this.logger.debug(`Updated summaries for user ${userId}`);
  }

  async getUserSummary(userId: string): Promise<UserSummaryDto | null> {
    const userSummary = await this.userSummaryRepository.findOne({
      where: { userId },
    });

    if (!userSummary) {
      return null;
    }

    return {
      userId: userSummary.userId,
      balance: Number(userSummary.balance),
      earned: Number(userSummary.earned),
      spent: Number(userSummary.spent),
      payout: Number(userSummary.payout),
      paidOut: Number(userSummary.paidOut),
    };
  }

  async getPayoutSummaries(): Promise<PayoutSummaryDto[]> {
    const payoutSummaries = await this.userSummaryRepository
      .createQueryBuilder('us')
      .select('us.userId', 'userId')
      .addSelect('us.payout', 'payoutAmount')
      .where('us.payout > 0')
      .getRawMany<PayoutSummaryRaw>();

    return payoutSummaries.map(
      (summary: PayoutSummaryRaw): PayoutSummaryDto => ({
        userId: summary.userId,
        payoutAmount: Number(summary.payoutAmount),
      }),
    );
  }

  // Force sync for development/testing
  async forceSyncTransactions(): Promise<void> {
    this.logger.log('Force syncing transactions...');
    await this.syncTransactions();
  }
}
