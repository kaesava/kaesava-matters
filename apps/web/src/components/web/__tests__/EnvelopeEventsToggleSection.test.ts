import "@money-matters/capability-budgeting/i18n";
import { describe, it, expect } from 'vitest';
import {
  EnvelopeEventsToggleSection,
  shouldShowPastStartDateWarning,
} from '../EnvelopeEventsToggleSection';
import { t } from '@kaesava/i18n';

describe('EnvelopeEventsToggleSection (Web)', () => {
  it('is exported and defined', () => {
    expect(EnvelopeEventsToggleSection).toBeDefined();
    expect(typeof EnvelopeEventsToggleSection).toBe('function');
  });

  it('provides all required translation strings for implication states', () => {
    const checked = t('categories.generateEventsCheckedImplication');
    const uncheckedEdit = t('categories.generateEventsUncheckedEditImplication');
    const uncheckedNew = t('categories.generateEventsUncheckedNewImplication');

    expect(checked).toBe(
      'Saving will generate upcoming expense events for up to 12 months on your calendar.'
    );
    expect(uncheckedEdit).toBe(
      'Saving will remove all upcoming scheduled events for this bill from your calendar.'
    );
    expect(uncheckedNew).toBe(
      'Saving will not create any upcoming expense events on your calendar.'
    );
  });

  describe('implication decision logic', () => {
    const resolveImplication = (
      generateEvents: boolean,
      initialGenerateEvents: boolean,
      hasExistingScheduledEvents: boolean,
      isEdit: boolean = false
    ) => {
      const isModified = generateEvents !== initialGenerateEvents;
      if (!isModified) return null;
      if (generateEvents) {
        return {
          variant: 'info',
          key: 'categories.generateEventsCheckedImplication',
        };
      }
      return {
        variant: 'warning',
        key:
          isEdit || hasExistingScheduledEvents
            ? 'categories.generateEventsUncheckedEditImplication'
            : 'categories.generateEventsUncheckedNewImplication',
      };
    };

    it('returns null when state has not been modified', () => {
      expect(resolveImplication(true, true, false)).toBeNull();
      expect(resolveImplication(false, false, true)).toBeNull();
    });

    it('returns info variant when toggled from false to true', () => {
      const res = resolveImplication(true, false, false);
      expect(res).toEqual({
        variant: 'info',
        key: 'categories.generateEventsCheckedImplication',
      });
    });

    it('returns edit warning variant when unchecking an existing envelope with events', () => {
      const res = resolveImplication(false, true, true);
      expect(res).toEqual({
        variant: 'warning',
        key: 'categories.generateEventsUncheckedEditImplication',
      });
    });

    it('returns edit warning variant when unchecking in edit mode even without pre-fetched events', () => {
      const res = resolveImplication(false, true, false, true);
      expect(res).toEqual({
        variant: 'warning',
        key: 'categories.generateEventsUncheckedEditImplication',
      });
    });

    it('returns new envelope warning variant when unchecking in create mode', () => {
      const res = resolveImplication(false, true, false, false);
      expect(res).toEqual({
        variant: 'warning',
        key: 'categories.generateEventsUncheckedNewImplication',
      });
    });
  });

  describe('shouldShowPastStartDateWarning', () => {
    it('shows in create mode when generateEvents is true and start date is in the past', () => {
      expect(
        shouldShowPastStartDateWarning({ generateEvents: true, isPastStartDate: true, isEdit: false })
      ).toBe(true);
    });

    it('hides in create mode when start date is not in the past or generateEvents is false', () => {
      expect(
        shouldShowPastStartDateWarning({ generateEvents: true, isPastStartDate: false, isEdit: false })
      ).toBe(false);
      expect(
        shouldShowPastStartDateWarning({ generateEvents: false, isPastStartDate: true, isEdit: false, isModified: true })
      ).toBe(false);
    });

    it('hides in edit mode when already enabled and nothing changed', () => {
      expect(
        shouldShowPastStartDateWarning({
          generateEvents: true,
          isPastStartDate: true,
          isEdit: true,
          isModified: false,
          isScheduleRuleChanged: false,
        })
      ).toBe(false);
    });

    it('hides in edit mode when unset and nothing changed', () => {
      expect(
        shouldShowPastStartDateWarning({
          generateEvents: false,
          isPastStartDate: true,
          isEdit: true,
          isModified: false,
          isScheduleRuleChanged: false,
        })
      ).toBe(false);
    });

    it('shows in edit mode when toggled from false to true with past start date', () => {
      expect(
        shouldShowPastStartDateWarning({
          generateEvents: true,
          isPastStartDate: true,
          isEdit: true,
          isModified: true,
        })
      ).toBe(true);
    });

    it('shows in edit mode when enabled and schedule/start date was changed with past start date', () => {
      expect(
        shouldShowPastStartDateWarning({
          generateEvents: true,
          isPastStartDate: true,
          isEdit: true,
          isModified: false,
          isScheduleRuleChanged: true,
        })
      ).toBe(true);
    });

    it('hides in edit mode when toggled from true to false even with past start date', () => {
      expect(
        shouldShowPastStartDateWarning({
          generateEvents: false,
          isPastStartDate: true,
          isEdit: true,
          isModified: true,
          isScheduleRuleChanged: true,
        })
      ).toBe(false);
    });
  });
});
