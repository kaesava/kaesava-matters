import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import JSZip from 'jszip';
import * as SecureStore from 'expo-secure-store';
import { usePostHog } from 'posthog-react-native';
import { useMobileToast, DESIGN_TOKENS, MobileButton, SwitchRow } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { buildExportFileName } from '@kaesava/types';
import { trpc } from '../../lib/trpc';
import { formatIsoDate } from '../../lib/format';
import { ANALYTICS_CONSENT_KEY } from '../MobileAnalyticsConsentPrompt';

export function PrivacyGovernanceSection() {
  const toast = useMobileToast();
  const posthog = usePostHog();
  const [isExporting, setIsExporting] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, { staleTime: 60_000 });
  const updatePrefs = trpc.updateUserPreferences.useMutation();

  React.useEffect(() => {
    const dbConsent = userPrefQuery.data?.telemetryConsent;
    if (dbConsent === 'granted' || dbConsent === 'denied') {
      setTelemetryEnabled(dbConsent === 'granted');
      SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, dbConsent).catch(() => {});
      return;
    }

    SecureStore.getItemAsync(ANALYTICS_CONSENT_KEY)
      .then((val) => {
        setTelemetryEnabled(val === 'granted');
      })
      .catch(() => {});
  }, [userPrefQuery.data?.telemetryConsent]);

  const handleToggleTelemetry = async (val: boolean) => {
    const consentValue = val ? 'granted' : 'denied';
    setTelemetryEnabled(val);
    try {
      await SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, consentValue);
      if (val) {
        posthog?.optIn();
      } else {
        posthog?.optOut();
      }
      updatePrefs.mutate({ telemetryConsent: consentValue });
    } catch {
      // Ignore
    }
  };

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleOpenExternalLegal = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url).catch(() => {});
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportQuery.refetch();
      if (res.data?.csvFiles) {
        const zip = new JSZip();
        Object.entries(res.data.csvFiles).forEach(([fileName, content]) => {
          if (typeof content === 'string') {
            zip.file(fileName, content);
          }
        });

        const base64 = await zip.generateAsync({ type: 'base64' });
        const dateStr = formatIsoDate(new Date());
        const exportFileName = buildExportFileName(dateStr);
        const fileUri = `${FileSystem.documentDirectory}${exportFileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/zip',
            dialogTitle: exportFileName,
            UTI: 'public.zip-archive',
          });
        }
        toast.success(t('toasts.exportSuccess'));
      } else {
        toast.error(t('common.errorTryAgain'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{t('privacy.title')}</Text>
      </View>

      <Text style={styles.cardSubtitle}>{t('privacy.aussiePrivacyDetail')}</Text>

      {/* Public Privacy Policy & Terms Links */}
      <TouchableOpacity
        onPress={() => handleOpenExternalLegal('https://moneymatters.kaesava.au/privacy')}
        style={styles.policyLinkRow}
        activeOpacity={0.7}
      >
        <Text style={styles.policyLinkText}>
          {t('privacy.viewPublicPrivacyPolicyLink')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleOpenExternalLegal('https://moneymatters.kaesava.au/terms')}
        style={styles.policyLinkRow}
        activeOpacity={0.7}
      >
        <Text style={styles.policyLinkText}>
          {t('privacy.viewPublicTermsLink')}
        </Text>
      </TouchableOpacity>

      {/* Export Data Action Button */}
      <View style={styles.btnRow}>
        <MobileButton
          variant="secondary"
          label={t('privacy.exportZipButton')}
          onPress={handleExportData}
          loading={isExporting}
          disabled={isExporting}
        />
      </View>

      {/* Telemetry Preference Switch */}
      <View style={styles.switchWrapper}>
        <SwitchRow
          label={t('privacy.analyticsConsentToggle')}
          hint={t('privacy.analyticsConsentToggleDesc')}
          value={telemetryEnabled}
          onValueChange={handleToggleTelemetry}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 12,
  },
  switchWrapper: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DESIGN_TOKENS.colors.border,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 17,
  },
  policyLinkRow: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  policyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  btnRow: {
    alignItems: 'flex-start',
    marginTop: 2,
  },
});
