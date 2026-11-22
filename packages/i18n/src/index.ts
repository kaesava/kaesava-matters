/**
 * Internationalization & Localization (i18n) Engine
 * 
 * Provides type-safe localization token resolution, key path traversal, fallback defaults,
 * and string interpolation parameters for UI components on web and mobile platforms.
 */
import { en } from "./dictionaries/en";

/**
 * Registry of supported localization dictionaries.
 * Note: Japanese (ja.ts) has been archived in ../../archive/ja.ts for Release 2 (V2_SCOPE.md).
 */
export const translations = {
  en,
} as const;

export type SupportedLanguage = keyof typeof translations;
let currentLanguage: SupportedLanguage = "en";
const appDictionaries: Record<string, Record<string, unknown>> = {};

/**
 * Registers app-specific domain translation namespaces (e.g. Ring 3 Money Matters
 * dictionaries) into the active runtime dictionary without creating Ring 1 -> Ring 3 imports.
 */
export function registerAppDictionary(
  dictionary: Record<string, unknown>,
  lang: SupportedLanguage = "en"
): void {
  appDictionaries[lang] = {
    ...(appDictionaries[lang] ?? {}),
    ...dictionary,
  };
}

export function setLanguage(lang: SupportedLanguage) {
  if (lang in translations) {
    currentLanguage = lang;
  }
}

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Creates a scoped app translator that inherits all platform keys from `en`
 * while allowing an app to supply its own domain namespaces or label overrides.
 */
export function createAppI18n(overrides: Record<string, unknown>) {
  return function appT(
    key: string,
    params?: { defaultValue?: string; [key: string]: unknown }
  ): string {
    const parts = key.split(".");
    let current: unknown = overrides;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "string") {
      if (!params) return current;
      return Object.entries(params).reduce(
        (acc, [k, v]) => (k === "defaultValue" ? acc : acc.replaceAll(`{${k}}`, String(v))),
        current
      );
    }
    return t(key as TranslationKey, params);
  };
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en> | (string & {});

/**
 * Translates a dot-notated key string into localized text.
 * Supports string interpolation parameters (e.g. {step}) and default fallback values.
 *
 * @param key - Dot-delimited translation path key (e.g. 'common.save')
 * @param optionsOrLocale - Optional locale identifier or interpolation options object
 * @returns Resolved localized string, fallback value, or original key string
 */
export function t(
  key: TranslationKey,
  optionsOrLocale?: SupportedLanguage | { defaultValue?: string; [key: string]: unknown }
): string {
  const parts = key.split(".");
  const appDict = appDictionaries[currentLanguage] || appDictionaries.en;
  let current: unknown = appDict;

  if (current) {
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
  }

  if (current === undefined) {
    const dict = translations[currentLanguage] || translations.en;
    current = dict;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
  }

  // Fallback to English dictionary if key is missing in active language
  if (current === undefined && currentLanguage !== "en") {
    let fallback: unknown = translations.en;
    for (const part of parts) {
      if (fallback && typeof fallback === "object" && part in fallback) {
        fallback = (fallback as Record<string, unknown>)[part];
      } else {
        fallback = undefined;
        break;
      }
    }
    current = fallback;
  }

  let result = typeof current === "string" ? current : undefined;

  if (
    !result &&
    optionsOrLocale &&
    typeof optionsOrLocale === "object" &&
    "defaultValue" in optionsOrLocale &&
    typeof optionsOrLocale.defaultValue === "string"
  ) {
    result = optionsOrLocale.defaultValue;
  }

  if (!result) {
    result = key;
  }

  if (optionsOrLocale && typeof optionsOrLocale === "object") {
    for (const [k, v] of Object.entries(optionsOrLocale)) {
      if (k !== "defaultValue") {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
  }

  return result;
}

export * from "./key-maps";

