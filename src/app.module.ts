import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SummaryController } from './controllers/summary.controller';
import { SummaryService } from './services/summary.service';
import { TransactionApiService } from './services/transaction-api.service';
import { Transaction } from './entities/transaction.entity';
import { UserSummary } from './entities/user-summary.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [Transaction, UserSummary],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([Transaction, UserSummary]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, SummaryController],
  providers: [AppService, SummaryService, TransactionApiService],
})
export class AppModule {}
