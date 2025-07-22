import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_summaries')
export class UserSummary {
  @PrimaryColumn('varchar')
  userId: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  earned: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  spent: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  payout: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  paidOut: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
