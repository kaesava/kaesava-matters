export interface BankAccountsWebAdapter {
  onSyncBalance: (accountId: string, balance: string) => Promise<void>;
}
