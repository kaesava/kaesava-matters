import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@kaesava/types";

export interface MobileLocaleConfig {
  locale: string;
  timezone: string;
  currency: string;
}

let currentMobileLocaleConfig: MobileLocaleConfig = {
  locale: DEFAULT_LOCALE,
  timezone: DEFAULT_TIMEZONE,
  currency: DEFAULT_CURRENCY,
};

export function setMobileLocaleConfig(cfg: Partial<MobileLocaleConfig>): void {
  currentMobileLocaleConfig = { ...currentMobileLocaleConfig, ...cfg };
}

export function getMobileLocaleConfig(): MobileLocaleConfig {
  return currentMobileLocaleConfig;
}
