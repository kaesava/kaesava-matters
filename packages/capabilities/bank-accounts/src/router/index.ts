import {
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  listBankAccountsWithExpectedHandler,
  syncBankBalanceHandler,
} from "../index";

export const bankAccountsProcedures = {
  create: { execute: createBankAccountHandler },
  update: { execute: updateBankAccountHandler },
  archive: { execute: archiveBankAccountHandler },
  list: { execute: listBankAccountsWithExpectedHandler },
  syncBalance: { execute: syncBankBalanceHandler },
} as const;
