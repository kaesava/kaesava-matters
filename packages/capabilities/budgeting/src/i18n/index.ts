import { createAppI18n, registerAppDictionary } from '@kaesava/i18n';
import { dashboard } from './dashboard';
import { envelopes } from './envelopes';
import { payday } from './payday';
import { plan } from './plan';
import { history } from './history';
import { setup } from './setup';
import { landing } from './landing';
import { reports } from './reports';

export const moneyMattersEn = {
  ...dashboard,
  ...envelopes,
  ...payday,
  ...plan,
  ...history,
  ...setup,
  ...landing,
  ...reports,
} as const;

registerAppDictionary(moneyMattersEn);

export const moneyMattersT = createAppI18n(moneyMattersEn);
export type MoneyMattersTranslationDictionary = typeof moneyMattersEn;
