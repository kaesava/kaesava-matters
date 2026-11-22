import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, DEFAULT_LOCALE } from "@money-matters/types";
import React, { useState } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { authClient } from '../lib/auth';
import { IconVisibilityProvider, MobileToastProvider, MobileToastContainer, MobileConfirmContainer, DateLocaleProvider, CurrencyLocaleProvider, AppThemeProvider, createDesignTokens } from "@money-matters/ui/mobile";
import { NotificationServiceProvider } from "@money-matters/capability-notifications/mobile";

const moneyMattersMobileTheme = createDesignTokens();
import { setLanguage, SupportedLanguage } from '@money-matters/i18n';
import { setMobileLocaleConfig } from '../lib/format';
import { posthog } from '../config/posthog';
import { MobileAnalyticsConsentPrompt } from '../components/MobileAnalyticsConsentPrompt';
import { MobileFileNotesProvider } from './FileNotesProvider';

interface AppProvidersProps {
  children: React.ReactNode;
}

function MobilePreferencesSync({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
    staleTime: 60_000,
  });
  const hasTenant = tenantStatusQuery.data?.hasTenant ?? false;

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
    retry: false,
    staleTime: 60_000,
  });
  const pref = userPrefQuery.data;
  const showIcons = pref?.showIcons ?? true;

  const resolvedLocale = React.useMemo(() => {
    const loc = pref?.locale || 'auto';
    if (loc === 'auto') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().locale || DEFAULT_LOCALE;
      } catch {
        return DEFAULT_LOCALE;
      }
    }
    return loc;
  }, [pref?.locale]);

  const userTimezone = pref?.timezone || pref?.tenantTimezone || DEFAULT_TIMEZONE;

  React.useEffect(() => {
    if (!session?.user?.id) {
      posthog.reset();
      return;
    }
    if (pref?.telemetryConsent === 'granted') {
      posthog.optIn();
      posthog.identify(session.user.id, { platform: 'mobile' });
    } else if (pref) {
      posthog.optOut();
    }
  }, [session?.user?.id, pref]);

  React.useEffect(() => {
    if (pref) {
      const language = (pref.language as SupportedLanguage) || 'en';
      setLanguage(language);

      const currency = pref.currency || DEFAULT_CURRENCY;

      setMobileLocaleConfig({
        locale: resolvedLocale,
        timezone: userTimezone,
        currency,
      });
    }
  }, [pref, resolvedLocale, userTimezone]);

  const currency = pref?.currency || DEFAULT_CURRENCY;

  return (
    <CurrencyLocaleProvider
      currency={currency}
      locale={resolvedLocale}
    >
      <DateLocaleProvider locale={resolvedLocale} timeZone={userTimezone}>
        <IconVisibilityProvider initialShowIcons={showIcons}>
          {children}
        </IconVisibilityProvider>
      </DateLocaleProvider>
    </CurrencyLocaleProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            const errStr = String((error as Error)?.message || error);
            if (
              errStr.includes("fetch failed") ||
              errStr.includes("NetworkError") ||
              errStr.includes("500") ||
              errStr.includes("502") ||
              errStr.includes("503") ||
              errStr.includes("Database")
            ) {
              console.warn("[Mobile Query Error]: Server or database unreachable", errStr);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            const errStr = String((error as Error)?.message || error);
            console.warn("[Mobile Mutation Error]: Mutation failed", errStr);
          },
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (
                error instanceof Error &&
                (error.message.includes('UNAUTHORIZED') ||
                  error.message.includes('FORBIDDEN') ||
                  error.message.includes('Authentication required'))
              ) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 1000 * 30, // 30s
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  const [trpcClient] = useState(() => buildTrpcClient());

  const notificationServiceValue = {
    useRegisterToken: () => trpc.registerToken.useMutation,
    useRemoveToken: () => trpc.removeToken.useMutation,
  };

  return (
    <AppThemeProvider theme={moneyMattersMobileTheme}>
      <SafeAreaProvider>
        <PostHogProvider
          client={posthog}
          autocapture={false}
        >
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <NotificationServiceProvider value={notificationServiceValue}>
                <MobilePreferencesSync>
                  <MobileToastProvider>
                    <MobileFileNotesProvider>
                      {children}
                    </MobileFileNotesProvider>
                    <MobileToastContainer />
                    <MobileConfirmContainer />
                    <MobileAnalyticsConsentPrompt />
                  </MobileToastProvider>
                </MobilePreferencesSync>
              </NotificationServiceProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </PostHogProvider>
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
