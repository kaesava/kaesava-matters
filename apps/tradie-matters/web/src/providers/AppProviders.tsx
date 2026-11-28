"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider, NetworkErrorBanner, ToastContainer, ToastProvider, createDesignTokens } from "@kaesava/ui/web";
import { t } from "@kaesava/i18n";
import "../i18n";
import { authClient } from "../lib/auth";
import { buildTrpcClient, trpc } from "../lib/trpc";
import posthog from "../lib/posthog-client";
import { LocaleProvider } from "./LocaleProvider";
import { WebFileNotesProvider } from "./FileNotesProvider";
import { AnalyticsConsentBanner } from "../components/GoogleAnalytics";

const tradieTheme = createDesignTokens();

interface NetworkStatusContextType {
  isGlobalError: boolean;
  clearGlobalError: () => void;
  lastErrorMessage: string | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isGlobalError: false,
  clearGlobalError: () => {},
  lastErrorMessage: null,
});

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

function isNetworkOrServerError(error: unknown): boolean {
  const errStr = String((error as Error)?.message || error);
  return (
    errStr.includes("fetch failed") ||
    errStr.includes("ECONNREFUSED") ||
    errStr.includes("502") ||
    errStr.includes("503") ||
    errStr.includes("NetworkError") ||
    errStr.includes("Failed to fetch")
  );
}

function SessionSyncTracker({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const identifiedDistinctId = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    const user = session?.user as { id?: unknown } | undefined;
    const distinctId = typeof user?.id === "string" && user.id.trim() ? user.id : null;
    if (!distinctId) {
      identifiedDistinctId.current = null;
      return;
    }
    if (identifiedDistinctId.current === distinctId) return;
    let isConsented = false;
    try {
      isConsented = window.localStorage?.getItem("mm_analytics_consent") === "granted";
    } catch {
      isConsented = false;
    }
    if (!isConsented) return;
    const identifiedUserId = posthog.get_property("$user_id");
    if (typeof identifiedUserId === "string" && identifiedUserId !== distinctId) {
      posthog.reset();
    }
    posthog.identify(distinctId);
    identifiedDistinctId.current = distinctId;
  }, [isPending, session]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [isGlobalError, setIsGlobalError] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [trpcClient] = useState(() => buildTrpcClient());

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isNetworkOrServerError(error)) {
              setIsGlobalError(true);
              setLastErrorMessage(t("tradieWeb.serverUnreachable"));
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isNetworkOrServerError(error)) {
              setIsGlobalError(true);
              setLastErrorMessage(t("tradieWeb.serverSaveError"));
            }
          },
        }),
        defaultOptions: {
          queries: { retry: 0, staleTime: 30_000, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      })
  );

  const clearGlobalError = () => {
    setIsGlobalError(false);
    setLastErrorMessage(null);
  };

  return (
    <AppThemeProvider theme={tradieTheme}>
      <NetworkStatusContext.Provider value={{ isGlobalError, clearGlobalError, lastErrorMessage }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <SessionSyncTracker>
                <LocaleProvider>
                  <NetworkErrorBanner
                    isVisible={isGlobalError}
                    onRetry={() => {
                      clearGlobalError();
                      void queryClient.refetchQueries();
                    }}
                    onDismiss={clearGlobalError}
                    message={lastErrorMessage}
                  />
                  <WebFileNotesProvider>{children}</WebFileNotesProvider>
                  <ToastContainer />
                  <AnalyticsConsentBanner />
                </LocaleProvider>
              </SessionSyncTracker>
            </ToastProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </NetworkStatusContext.Provider>
    </AppThemeProvider>
  );
}
