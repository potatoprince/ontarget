import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SummaryService } from '../services/summary.service';
import { UserSummaryDto, PayoutSummaryDto } from '../dto/transaction.dto';

@Controller('api')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('users/:userId/summary')
  async getUserSummary(
    @Param('userId') userId: string,
  ): Promise<UserSummaryDto> {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const summary = await this.summaryService.getUserSummary(userId);

    if (!summary) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return summary;
  }

  @Get('payouts')
  async getPayoutSummaries(): Promise<PayoutSummaryDto[]> {
    return this.summaryService.getPayoutSummaries();
  }

  @Post('sync')
  async forceSyncTransactions(): Promise<{ message: string }> {
    await this.summaryService.forceSyncTransactions();
    return { message: 'Transaction sync completed' };
  }
}
