export type SupportedBankProvider = string;

export interface BankAccountItemToEdit {
  id: string;
  name: string;
  bankProvider?: string | null;
  accountType?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
}
