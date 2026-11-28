import "../i18n/tradieMobile";
import React, { useEffect } from "react";
import { Stack, router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DESIGN_TOKENS } from "@kaesava/ui/mobile";
import { initPushNotificationHandlers } from "../lib/push";
import { logger } from "../lib/logger";
import { AppProviders } from "../providers/AppProviders";

export default function RootLayout() {
  useEffect(() => {
    logger.info("Tradie Matters Mobile initialized.");
    let cleanup: (() => void) | undefined;
    initPushNotificationHandlers((url) => {
      if (url.startsWith("/")) router.push(url as Href);
    })
      .then((fn) => {
        cleanup = fn;
      })
      .catch(() => {});
    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor={DESIGN_TOKENS.colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
