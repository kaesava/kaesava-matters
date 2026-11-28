import React, { useEffect } from "react";
import { Tabs, useRouter, useSegments, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS } from "@kaesava/ui/mobile";
import { authClient } from "../../lib/auth";
import { getPushPlatform, registerPushNotificationsAsync } from "../../lib/push";
import { getActiveTenantId, switchActiveTenant, trpc } from "../../lib/trpc";

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const utils = trpc.useUtils();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const statusQuery = trpc.getTenantStatus.useQuery(undefined, { enabled: !!session?.user });
  const tenantsQuery = trpc.listUserTenants.useQuery(undefined, { enabled: !!session?.user });
  const registerTokenMut = trpc.registerToken.useMutation();

  useEffect(() => {
    const tenants = tenantsQuery.data;
    if (tenants && tenants.length > 0) {
      const active = getActiveTenantId();
      if (!active || !tenants.some((item) => item.id === active)) {
        const preferred = tenants.find((item) => item.role === "OWNER") || tenants[0];
        if (preferred) void switchActiveTenant(preferred.id, utils);
      }
    } else if (statusQuery.data?.tenantId && getActiveTenantId() !== statusQuery.data.tenantId) {
      void switchActiveTenant(statusQuery.data.tenantId, utils);
    }
  }, [tenantsQuery.data, statusQuery.data?.tenantId, utils]);

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.replace("/(auth)/sign-in" as Href);
      return;
    }
    if (session?.user && !statusQuery.isLoading && statusQuery.data) {
      if (!statusQuery.data.hasTenant) router.replace("/(auth)/complete-profile" as Href);
      else if (statusQuery.data.setupCompleted === false && !(segments as string[]).includes("(setup)")) {
        router.replace("/(setup)/business" as Href);
      }
    }
  }, [sessionPending, session?.user, statusQuery.isLoading, statusQuery.data, segments, router]);

  useEffect(() => {
    if (!session?.user || !statusQuery.data?.hasTenant) return;
    void registerPushNotificationsAsync().then((token) => {
      if (token) registerTokenMut.mutate({ token, platform: getPushPlatform() });
    });
  }, [session?.user, statusQuery.data?.hasTenant]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DESIGN_TOKENS.colors.accent,
        tabBarInactiveTintColor: DESIGN_TOKENS.colors.slate[500],
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          backgroundColor: DESIGN_TOKENS.colors.surface,
          borderTopColor: DESIGN_TOKENS.colors.slate[200],
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t("tradieMobile.todayTitle"),
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("tradieMobile.inboxTitle"),
          tabBarIcon: ({ color, size }) => <Feather name="message-square" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: t("tradieJobs.jobsTitle"),
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{
          title: t("tradieCrm.customersTitle"),
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pricebook"
        options={{
          title: t("tradieCrm.pricebookTitle"),
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.settings"),
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="customers/[id]" options={{ href: null }} />
      <Tabs.Screen name="quotes/index" options={{ href: null }} />
      <Tabs.Screen name="quotes/[id]" options={{ href: null }} />
      <Tabs.Screen name="invoices/index" options={{ href: null }} />
      <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
      <Tabs.Screen name="timesheets" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="suppliers" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="settings/notifications" options={{ href: null }} />
      <Tabs.Screen name="settings/archived" options={{ href: null }} />
    </Tabs>
  );
}
