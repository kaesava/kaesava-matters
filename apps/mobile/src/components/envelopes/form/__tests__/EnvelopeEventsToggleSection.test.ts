import { describe, it, expect, vi } from 'vitest';
import { t } from '@kaesava/i18n';

vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

vi.mock('@kaesava/ui/mobile', () => ({
  MobileCheckbox: 'MobileCheckbox',
  MobileAlertBanner: 'MobileAlertBanner',
}));

import { shouldShowPastStartDateWarning } from '../EnvelopeEventsToggleSection';

describe('EnvelopeEventsToggleSection (Mobile Parity)', () => {
  it('uses shared i18n keys for web and mobile parity', () => {
    expect(t('categories.generateEventsCheckedImplication')).toBe(
      'Saving will generate upcoming expense events for up to 12 months on your calendar.'
    );
    expect(t('categories.generateEventsUncheckedEditImplication')).toBe(
      'Saving will remove all upcoming scheduled events for this bill from your calendar.'
    );
    expect(t('categories.generateEventsUncheckedNewImplication')).toBe(
      'Saving will not create any upcoming expense events on your calendar.'
    );
  });

  it('matches web past-start-date warning visibility across create and edit states', () => {
    expect(shouldShowPastStartDateWarning({ generateEvents: true, isPastStartDate: true, isEdit: false })).toBe(true);
    expect(shouldShowPastStartDateWarning({ generateEvents: true, isPastStartDate: true, isEdit: true })).toBe(false);
    expect(
      shouldShowPastStartDateWarning({
        generateEvents: true,
        isPastStartDate: true,
        isEdit: true,
        isModified: true,
      })
    ).toBe(true);
    expect(
      shouldShowPastStartDateWarning({
        generateEvents: true,
        isPastStartDate: true,
        isEdit: true,
        isScheduleRuleChanged: true,
      })
    ).toBe(true);
    expect(
      shouldShowPastStartDateWarning({
        generateEvents: false,
        isPastStartDate: true,
        isEdit: true,
        isModified: true,
      })
    ).toBe(false);
  });
});
