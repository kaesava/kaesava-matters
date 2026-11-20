import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MobileCheckbox, MobileAlertBanner } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface EnvelopeEventsToggleSectionProps {
  generateEvents: boolean;
  setGenerateEvents: (val: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
  isEdit?: boolean;
  isPastStartDate?: boolean;
  isScheduleRuleChanged?: boolean;
}

export function shouldShowPastStartDateWarning({
  generateEvents,
  isPastStartDate = false,
  isEdit = false,
  isModified = false,
  isScheduleRuleChanged = false,
}: {
  generateEvents: boolean;
  isPastStartDate?: boolean;
  isEdit?: boolean;
  isModified?: boolean;
  isScheduleRuleChanged?: boolean;
}): boolean {
  return Boolean(generateEvents && isPastStartDate && (!isEdit || isModified || isScheduleRuleChanged));
}

export const EnvelopeEventsToggleSection: React.FC<EnvelopeEventsToggleSectionProps> = ({
  generateEvents,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
  isEdit = false,
  isPastStartDate = false,
  isScheduleRuleChanged = false,
}) => {
  const isModified = generateEvents !== initialGenerateEvents;
  const showPastStartDateWarning = shouldShowPastStartDateWarning({
    generateEvents,
    isPastStartDate,
    isEdit,
    isModified,
    isScheduleRuleChanged,
  });

  return (
    <View style={styles.container}>
      <MobileCheckbox
        label={t('categories.generateEventsLabel')}
        checked={generateEvents}
        onChange={setGenerateEvents}
      />
      {isModified && (
        <View style={styles.bannerWrapper}>
          {generateEvents ? (
            <MobileAlertBanner variant="info">
              {t('categories.generateEventsCheckedImplication')}
            </MobileAlertBanner>
          ) : (
            <MobileAlertBanner variant="warning">
              {isEdit || hasExistingScheduledEvents
                ? t('categories.generateEventsUncheckedEditImplication')
                : t('categories.generateEventsUncheckedNewImplication')}
            </MobileAlertBanner>
          )}
        </View>
      )}
      {showPastStartDateWarning && (
        <View style={styles.bannerWrapper}>
          <MobileAlertBanner variant="warning">
            {t('categories.generateEventsPastStartDateWarning')}
          </MobileAlertBanner>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    gap: 4,
  },
  bannerWrapper: {
    marginTop: 6,
  },
});
