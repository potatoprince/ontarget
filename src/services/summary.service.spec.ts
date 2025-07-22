import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SummaryService } from './summary.service';
import { TransactionApiService } from './transaction-api.service';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { UserSummary } from '../entities/user-summary.entity';
import { TransactionApiResponse } from '../dto/transaction.dto';

describe('SummaryService', () => {
  let service: SummaryService;

  // Mock repositories
  const mockTransactionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserSummaryRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  };

  // Mock TransactionApiService
  const mockTransactionApiService = {
    getTransactions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(UserSummary),
          useValue: mockUserSummaryRepository,
        },
        {
          provide: TransactionApiService,
          useValue: mockTransactionApiService,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserSummary', () => {
    it('should return user summary when user exists', async () => {
      const userId = 'test-user-id';
      const mockUserSummary = {
        userId,
        balance: 100.5,
        earned: 200.75,
        spent: 50.25,
        payout: 50,
        paidOut: 50,
      };

      mockUserSummaryRepository.findOne.mockResolvedValue(mockUserSummary);

      const result = await service.getUserSummary(userId);

      expect(result).toEqual({
        userId: 'test-user-id',
        balance: 100.5,
        earned: 200.75,
        spent: 50.25,
        payout: 50,
        paidOut: 50,
      });

      expect(mockUserSummaryRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return null when user does not exist', async () => {
      const userId = 'non-existent-user';

      mockUserSummaryRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserSummary(userId);

      expect(result).toBeNull();
    });
  });

  describe('getPayoutSummaries', () => {
    it('should return payout summaries for users with positive payouts', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user1', payoutAmount: 100 },
          { userId: 'user2', payoutAmount: 200 },
        ]),
      };

      mockUserSummaryRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getPayoutSummaries();

      expect(result).toEqual([
        { userId: 'user1', payoutAmount: 100 },
        { userId: 'user2', payoutAmount: 200 },
      ]);
    });

    it('should return empty array when no users have payouts', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockUserSummaryRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getPayoutSummaries();

      expect(result).toEqual([]);
    });
  });

  describe('syncTransactions', () => {
    it('should sync new transactions and update summaries', async () => {
      const mockTransactionResponse: TransactionApiResponse = {
        items: [
          {
            id: 'trans1',
            userId: 'user1',
            createdAt: '2024-01-01T00:00:00Z',
            type: 'earned',
            amount: 100,
          },
        ],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };

      mockTransactionApiService.getTransactions.mockResolvedValue(
        mockTransactionResponse,
      );
      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockTransactionRepository.create.mockReturnValue({
        id: 'trans1',
        userId: 'user1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        type: TransactionType.EARNED,
        amount: 100,
      });

      // Mock user summary repository for recalculation
      mockUserSummaryRepository.findOne.mockResolvedValue(null);
      mockUserSummaryRepository.create.mockReturnValue({
        userId: 'user1',
        balance: 0,
        earned: 0,
        spent: 0,
        payout: 0,
        paidOut: 0,
      });

      mockTransactionRepository.find.mockResolvedValue([
        {
          id: 'trans1',
          userId: 'user1',
          type: TransactionType.EARNED,
          amount: 100,
        },
      ]);

      await service.syncTransactions();

      expect(mockTransactionApiService.getTransactions).toHaveBeenCalled();
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      expect(mockUserSummaryRepository.save).toHaveBeenCalled();
    });

    it('should skip sync when no new transactions', async () => {
      const mockTransactionResponse: TransactionApiResponse = {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      };

      mockTransactionApiService.getTransactions.mockResolvedValue(
        mockTransactionResponse,
      );

      await service.syncTransactions();

      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('recalculateUserSummary', () => {
    it('should calculate correct balances for different transaction types', async () => {
      const userId = 'user1';
      const mockTransactions = [
        {
          userId,
          type: TransactionType.EARNED,
          amount: 500,
        },
        {
          userId,
          type: TransactionType.SPENT,
          amount: 100,
        },
        {
          userId,
          type: TransactionType.PAYOUT,
          amount: 200,
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(mockTransactions);
      mockUserSummaryRepository.findOne.mockResolvedValue(null);
      mockUserSummaryRepository.create.mockImplementation(
        (data: { userId: string }) =>
          ({
            userId: data.userId,
            balance: 0,
            earned: 0,
            spent: 0,
            payout: 0,
            paidOut: 0,
          }) as UserSummary,
      );

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockUserSummaryRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service['recalculateUserSummary'](userId);

      expect(mockUserSummaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          earned: 500,
          spent: 100,
          payout: 200,
          paidOut: 200,
          balance: 200, // 500 - 100 - 200
        }),
      );

      expect(mockUserSummaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          earned: 500,
          spent: 100,
          payout: 200,
          paidOut: 200,
          balance: 200,
        }),
      );

      expect(mockUserSummaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          earned: 500,
          spent: 100,
          payout: 200,
          paidOut: 200,
          balance: 200,
        }),
      );
    });

    it('should update existing user summary', async () => {
      const userId = 'user1';
      const mockTransactions = [
        {
          userId,
          type: TransactionType.EARNED,
          amount: 300,
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(mockTransactions);
      mockUserSummaryRepository.findOne.mockResolvedValue(null);
      mockUserSummaryRepository.create.mockReturnValue({
        userId,
        balance: 0,
        earned: 0,
        spent: 0,
        payout: 0,
        paidOut: 0,
      });

      await service['recalculateUserSummary'](userId);

      expect(mockUserSummaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          earned: 300,
          spent: 0,
          payout: 0,
          paidOut: 0,
          balance: 300,
        }),
      );
    });
  });

  describe('forceSyncTransactions', () => {
    it('should call syncTransactions', async () => {
      const syncTransactionsSpy = jest
        .spyOn(service, 'syncTransactions')
        .mockResolvedValue();

      await service.forceSyncTransactions();

      expect(syncTransactionsSpy).toHaveBeenCalled();
    });
  });
});
