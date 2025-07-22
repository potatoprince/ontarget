export class TransactionDto {
  id: string;
  userId: string;
  createdAt: string;
  type: 'earned' | 'spent' | 'payout';
  amount: number;
}

export class TransactionApiResponse {
  items: TransactionDto[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export class UserSummaryDto {
  userId: string;
  balance: number;
  earned: number;
  spent: number;
  payout: number;
  paidOut: number;
}

export class PayoutSummaryDto {
  userId: string;
  payoutAmount: number;
}
