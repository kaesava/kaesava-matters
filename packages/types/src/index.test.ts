import { describe, it, expect } from 'vitest';
import {
  BaseSchema,
  BankAccountSchema,
  ListTransactionsQuery,
  ListEnvelopeTransactionsQuery,
  CanAffordQuery,
  GetSpendingAnalyticsQuery,
  GetPaydayPlanAnalyticsQuerySchema,
} from './index';

describe('Domain Schemas Validation', () => {
  const mockBase = {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    appId: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date(),
    createdBy: '44444444-4444-4444-8444-444444444444',
    updatedAt: new Date(),
    updatedBy: '44444444-4444-4444-8444-444444444444',
    archivedAt: null,
  };

  it('validates BaseSchema properly and rejects invalid UUIDs or extra keys', () => {
    expect(() => BaseSchema.parse(mockBase)).not.toThrow();
    expect(() => BaseSchema.parse({ ...mockBase, id: 'invalid-uuid' })).toThrow();
    expect(() => BaseSchema.parse({ ...mockBase, extraKey: 'bad' })).toThrow();
  });

  it('validates BankAccountSchema defaults', () => {
    const bank = BankAccountSchema.parse({
      ...mockBase,
      name: 'Main Checking',
    });
    expect(bank.lastKnownBalance).toBe('0.00');
    expect(bank.unbudgetedBuffer).toBe('0.00');
  });

  it('validates transaction queries', () => {
    const listQuery = ListTransactionsQuery.parse({});
    expect(listQuery.limit).toBe(50);
    expect(listQuery.offset).toBe(0);

    const envQuery = ListEnvelopeTransactionsQuery.parse({
      envelopeId: '77777777-7777-4777-8777-777777777777',
    });
    expect(envQuery.limit).toBe(30);
  });

  it('validates CanAffordQuery', () => {
    const validQuery = CanAffordQuery.parse({ amount: '120.50' });
    expect(validQuery.amount).toBe('120.50');

    expect(() => CanAffordQuery.parse({ amount: '120.501' })).toThrow();
  });

  it('validates GetSpendingAnalyticsQuery and GetPaydayPlanAnalyticsQuerySchema', () => {
    const defaultQuery = GetSpendingAnalyticsQuery.parse({});
    expect(defaultQuery.timeframe).toBe('90D');

    const filteredQuery = GetSpendingAnalyticsQuery.parse({
      timeframe: '1Y',
      envelopeId: 'pool-123',
      searchQuery: 'woolworths',
      flowType: 'DEBIT',
    });
    expect(filteredQuery.envelopeId).toBe('pool-123');
    expect(filteredQuery.flowType).toBe('DEBIT');

    const paydayDefault = GetPaydayPlanAnalyticsQuerySchema.parse({});
    expect(paydayDefault.timeframe).toBe('90D');

    const paydayFiltered = GetPaydayPlanAnalyticsQuerySchema.parse({
      timeframe: '30D',
      bankAccountId: 'bank-123',
      searchQuery: 'Salary',
    });
    expect(paydayFiltered.timeframe).toBe('30D');
    expect(paydayFiltered.bankAccountId).toBe('bank-123');
    expect(paydayFiltered.searchQuery).toBe('Salary');
  });
});

