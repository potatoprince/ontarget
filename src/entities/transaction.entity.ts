import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionType {
  EARNED = 'earned',
  SPENT = 'spent',
  PAYOUT = 'payout',
}

@Entity('transactions')
export class Transaction {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'varchar',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
