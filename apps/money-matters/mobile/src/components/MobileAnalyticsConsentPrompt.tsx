import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { usePostHog } from 'posthog-react-native';
import { MobileModalDialog, MobileButton, DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';

export const ANALYTICS_CONSENT_KEY = 'mm_analytics_consent';

export function MobileAnalyticsConsentPrompt() {
  const posthog = usePostHog();
  const [visible, setVisible] = useState(false);
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean((session?.user as { id?: unknown } | undefined)?.id);
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });
  const hasTenant = tenantStatusQuery.data?.hasTenant ?? false;
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: isAuthenticated && hasTenant,
    retry: false,
    staleTime: 60_000,
  });
  const utils = trpc.useUtils();
  const hasSyncedConsentRef = useRef(false);
  const { mutate: updateTelemetryConsent } = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      void utils.getUserPreferences.invalidate();
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !hasTenant) {
      hasSyncedConsentRef.current = false;
    }
    let isMounted = true;
    SecureStore.getItemAsync(ANALYTICS_CONSENT_KEY)
      .then((localConsent) => {
        if (!isMounted) return;
        const dbConsent = userPrefQuery.data?.telemetryConsent ?? null;
        const effectiveConsent =
          dbConsent ?? (localConsent === 'granted' || localConsent === 'denied' ? localConsent : null);

        if (effectiveConsent === 'granted') {
          SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, 'granted').catch(() => {});
          posthog?.optIn();
          setVisible(false);
        } else if (effectiveConsent === 'denied') {
          SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, 'denied').catch(() => {});
          posthog?.optOut();
          setVisible(false);
        } else {
          posthog?.optOut();
          if (!isAuthenticated || !hasTenant || userPrefQuery.isFetched) {
            setVisible(true);
          }
        }

        if (
          dbConsent === null &&
          (localConsent === 'granted' || localConsent === 'denied') &&
          isAuthenticated &&
          hasTenant &&
          userPrefQuery.isFetched &&
          !hasSyncedConsentRef.current
        ) {
          hasSyncedConsentRef.current = true;
          updateTelemetryConsent({ telemetryConsent: localConsent });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [posthog, isAuthenticated, hasTenant, userPrefQuery.data?.telemetryConsent, userPrefQuery.isFetched, updateTelemetryConsent]);

  const handleConsent = async (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    try {
      await SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, value);
      if (granted) {
        posthog?.optIn();
      } else {
        posthog?.optOut();
      }
      if (isAuthenticated && hasTenant) {
        updateTelemetryConsent({ telemetryConsent: value });
      }
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={() => handleConsent(false)}
      title={t('privacy.analyticsConsentTitle')}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            label={t('privacy.analyticsConsentDecline')}
            onPress={() => handleConsent(false)}
          />
          <MobileButton
            variant="primary"
            label={t('privacy.analyticsConsentAccept')}
            onPress={() => handleConsent(true)}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.description}>
          {t('privacy.analyticsConsentDesc')}
        </Text>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
  description: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
