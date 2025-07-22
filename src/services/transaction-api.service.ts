import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TransactionApiResponse, TransactionDto } from '../dto/transaction.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class TransactionApiService {
  private readonly logger = new Logger(TransactionApiService.name);
  private readonly baseUrl = 'http://localhost:3001'; // Mock API URL

  constructor(private readonly httpService: HttpService) {}

  async getTransactions(
    startDate: string,
    endDate: string,
  ): Promise<TransactionApiResponse> {
    try {
      const url = `${this.baseUrl}/transactions`;
      const allTransactions: TransactionDto[] = [];
      let currentPage = 1;
      let totalPages = 1;
      const maxPages = 100; // Safety limit to prevent infinite loops

      this.logger.debug(
        `Fetching transactions from ${startDate} to ${endDate}`,
      );

      // Fetch all pages of transactions
      do {
        const params = { startDate, endDate, page: currentPage.toString() };

        const response = await firstValueFrom(
          this.httpService.get<TransactionApiResponse>(url, { params }),
        );

        allTransactions.push(...response.data.items);
        totalPages = response.data.meta.totalPages;

        this.logger.debug(
          `Retrieved page ${currentPage}/${totalPages} with ${response.data.items.length} transactions`,
        );

        currentPage++;

        if (currentPage > maxPages) {
          this.logger.warn(
            `Reached maximum page limit (${maxPages}), stopping pagination`,
          );
          break;
        }
      } while (currentPage <= totalPages);

      this.logger.debug(
        `Retrieved total of ${allTransactions.length} transactions across ${Math.min(totalPages, maxPages)} pages`,
      );

      // Return response with all transactions
      return {
        items: allTransactions,
        meta: {
          totalItems: allTransactions.length,
          itemCount: allTransactions.length,
          itemsPerPage: allTransactions.length,
          totalPages: 1,
          currentPage: 1,
        },
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn(
        `External API unavailable, using mock data. ${errorMessage}`,
      );
      // Return mock data for development
      return this.getMockTransactions();
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      return `Reason: ${error.code || error.message}`;
    }
    if (error instanceof Error) {
      return `Reason: ${error.message}`;
    }
    return 'Reason: Unknown error';
  }

  // Mock data generator for development and testing
  private getMockTransactions(): TransactionApiResponse {
    const allMockTransactions: TransactionDto[] = [
      {
        id: '41bbdf81-735c-4aea-beb3-3e5f433a30c5',
        userId: '074092',
        createdAt: '2023-03-16T12:33:11.000Z',
        type: 'payout',
        amount: 30,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-3e5fasfsdfef',
        userId: '074092',
        createdAt: '2023-03-12T12:33:11.000Z',
        type: 'spent',
        amount: 12,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-342jhj234nj234',
        userId: '074092',
        createdAt: '2023-03-15T12:33:11.000Z',
        type: 'earned',
        amount: 1.2,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-3e5f433a30c6',
        userId: '074093',
        createdAt: '2023-03-16T12:33:11.000Z',
        type: 'earned',
        amount: 50,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-3e5f433a30c7',
        userId: '074093',
        createdAt: '2023-03-17T12:33:11.000Z',
        type: 'payout',
        amount: 25,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-3e5f433a30c8',
        userId: '074094',
        createdAt: '2023-03-18T12:33:11.000Z',
        type: 'earned',
        amount: 100,
      },
      {
        id: '41bbdf81-735c-4aea-beb3-3e5f433a30c9',
        userId: '074094',
        createdAt: '2023-03-19T12:33:11.000Z',
        type: 'spent',
        amount: 25,
      },
    ];

    // return only first 5 items (as if this is page 1)
    const itemsPerPage = 5;
    const currentPage = 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = allMockTransactions.slice(startIndex, endIndex);

    return {
      items: pageItems,
      meta: {
        totalItems: allMockTransactions.length,
        itemCount: pageItems.length,
        itemsPerPage: itemsPerPage,
        totalPages: Math.ceil(allMockTransactions.length / itemsPerPage),
        currentPage: currentPage,
      },
    };
  }
}
