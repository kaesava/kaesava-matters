import "../i18n/tradieMobile";
import React, { useMemo, useState } from "react";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@kaesava/types";
import { setLanguage, type SupportedLanguage } from "@kaesava/i18n";
import {
  AppThemeProvider,
  CurrencyLocaleProvider,
  DateLocaleProvider,
  IconVisibilityProvider,
  MobileConfirmContainer,
  MobileToastContainer,
  MobileToastProvider,
  createDesignTokens,
} from "@kaesava/ui/mobile";
import { authClient } from "../lib/auth";
import { setMobileLocaleConfig } from "../lib/format";
import { logger } from "../lib/logger";
import { buildTrpcClient, trpc } from "../lib/trpc";
import { MobileFileNotesProvider } from "./FileNotesProvider";
import { OutboxSyncWrapper } from "./OutboxSyncWrapper";

const tradieTheme = createDesignTokens();

function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (err) => logger.warn("[Query Error]", String((err as Error)?.message || err)),
    }),
    mutationCache: new MutationCache({
      onError: (err) => logger.warn("[Mutation Error]", String((err as Error)?.message || err)),
    }),
    defaultOptions: {
      queries: {
        retry: (count, err) => {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("UNAUTHORIZED") || msg.includes("FORBIDDEN")) return false;
          return count < 2;
        },
        staleTime: 30_000,
      },
      mutations: { retry: 0 },
    },
  });
}

function MobilePreferencesSync({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const statusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
    staleTime: 60_000,
  });
  const hasTenant = statusQuery.data?.hasTenant ?? false;
  const prefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
    retry: false,
    staleTime: 60_000,
  });
  const pref = prefQuery.data;

  const resolvedLocale = useMemo(() => {
    const loc = pref?.locale || "auto";
    if (loc !== "auto") return loc;
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale || DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }, [pref?.locale]);

  const timezone = pref?.timezone || pref?.tenantTimezone || DEFAULT_TIMEZONE;
  const currency = pref?.currency || DEFAULT_CURRENCY;

  React.useEffect(() => {
    if (!pref) return;
    setLanguage((pref.language as SupportedLanguage) || "en");
    setMobileLocaleConfig({ locale: resolvedLocale, timezone, currency });
  }, [pref, resolvedLocale, timezone, currency]);

  return (
    <CurrencyLocaleProvider currency={currency} locale={resolvedLocale}>
      <DateLocaleProvider locale={resolvedLocale} timeZone={timezone}>
        <IconVisibilityProvider initialShowIcons={pref?.showIcons ?? true}>
          {children}
        </IconVisibilityProvider>
      </DateLocaleProvider>
    </CurrencyLocaleProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(() => buildTrpcClient());

  return (
    <AppThemeProvider theme={tradieTheme}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <MobilePreferencesSync>
              <MobileToastProvider>
                <OutboxSyncWrapper>
                  <MobileFileNotesProvider>{children}</MobileFileNotesProvider>
                </OutboxSyncWrapper>
                <MobileToastContainer />
                <MobileConfirmContainer />
              </MobileToastProvider>
            </MobilePreferencesSync>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
