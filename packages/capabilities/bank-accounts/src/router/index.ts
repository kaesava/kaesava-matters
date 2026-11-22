import {
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  listBankAccountsHandler,
  syncBankBalanceHandler,
} from "../index";

export const bankAccountsProcedures = {
  create: { execute: createBankAccountHandler },
  update: { execute: updateBankAccountHandler },
  archive: { execute: archiveBankAccountHandler },
  list: { execute: listBankAccountsHandler },
  syncBalance: { execute: syncBankBalanceHandler },
} as const;
