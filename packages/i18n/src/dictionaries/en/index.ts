import { common } from './common';
import { auth } from './auth';
import { settings } from './settings';
import { settingsSections } from './settings-sections';
import { privacy } from './privacy';
import { feedback } from './feedback';
import { tour } from './tour';
import { commandPalette } from './commandPalette';
import { fileNotes } from './fileNotes';

export const platformEn = {
  ...common,
  ...auth,
  ...settings,
  ...settingsSections,
  ...privacy,
  ...feedback,
  ...tour,
  ...commandPalette,
  ...fileNotes,
} as const;

export const en = platformEn;

export type PlatformTranslationDictionary = typeof platformEn;
export type TranslationDictionary = typeof en;
