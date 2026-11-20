'use client';

import { useState, useEffect } from 'react';
import posthog from '../../lib/posthog-client';
import { Button } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';
import { authClient } from '../../lib/auth';
import { trpc } from '../../lib/trpc';

export const ANALYTICS_CONSENT_KEY = 'mm_analytics_consent';

export function AnalyticsConsentBanner() {
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
  const { mutate: updateTelemetryConsent, isPending: isUpdatingConsent } = trpc.updateUserPreferences.useMutation();

  useEffect(() => {
    try {
      const localConsent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      const dbConsent = userPrefQuery.data?.telemetryConsent ?? null;
      const effectiveConsent = dbConsent ?? (localConsent === 'granted' || localConsent === 'denied' ? localConsent : null);

      if (effectiveConsent === 'granted') {
        localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
        posthog.opt_in_capturing();
        setVisible(false);
      } else if (effectiveConsent === 'denied') {
        localStorage.setItem(ANALYTICS_CONSENT_KEY, 'denied');
        posthog.opt_out_capturing();
        setVisible(false);
      } else {
        posthog.opt_out_capturing();
        if (!isAuthenticated || !hasTenant || userPrefQuery.isFetched) {
          setVisible(true);
        }
      }

      if (dbConsent === null && (localConsent === 'granted' || localConsent === 'denied') && isAuthenticated && hasTenant && userPrefQuery.isFetched && !isUpdatingConsent) {
        updateTelemetryConsent({ telemetryConsent: localConsent });
      }
    } catch {
      // In private browsing mode or local storage disabled
    }
  }, [isAuthenticated, hasTenant, userPrefQuery.data?.telemetryConsent, userPrefQuery.isFetched, isUpdatingConsent, updateTelemetryConsent]);

  const handleConsent = (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
      if (granted) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
      if (isAuthenticated && hasTenant) {
        updateTelemetryConsent({ telemetryConsent: value });
      }
      window.dispatchEvent(new Event('mm-analytics-consent-changed'));
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('privacy.analyticsConsentTitle')}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('privacy.analyticsConsentTitle')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('privacy.analyticsConsentDesc')}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleConsent(false)}
        >
          {t('privacy.analyticsConsentDecline')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => handleConsent(true)}
        >
          {t('privacy.analyticsConsentAccept')}
        </Button>
      </div>
    </div>
  );
}
