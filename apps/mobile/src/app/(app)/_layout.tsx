import React from 'react';
import { Tabs, useSegments, useRouter, type Href } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESIGN_TOKENS, useMobileToast, usePushNotifications } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { Feather } from '@expo/vector-icons';
import { trpc, getActiveTenantId, switchActiveTenant } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { QuickActionFab } from '../../components/QuickActionFab';
import { EnvelopeFormModal } from '../../components/EnvelopeFormModal';
import { MobileProductTourProvider } from '../../context/ProductTourContext';
import { CommandPaletteProvider } from '../../context/CommandPaletteContext';

function TabIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  size: number;
}) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={size} color={color} />
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const { showToast } = useMobileToast();
  const [poolModalVisible, setPoolModalVisible] = React.useState(false);

  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const userTenantsQuery = trpc.listUserTenants.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const utils = trpc.useUtils();
  const burstUpcomingEvents = trpc.burstUpcomingEvents.useMutation();
  const lastBurstTenantId = React.useRef<string | null>(null);
  const router = useRouter();
  const subQuery = trpc.getSubscriptionStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Auto-burst rolling window of scheduled bills and income on authenticated tenant entry
  React.useEffect(() => {
    const activeTenantId = getActiveTenantId() || tenantStatusQuery.data?.tenantId;
    const subStatus = subQuery.data;
    const hasWriteAccess =
      !!subStatus &&
      !subStatus.isTrialExpired &&
      !subStatus.isGracePeriod &&
      !subStatus.isPastDue &&
      !subStatus.isDeactivated;
    if (session?.user && activeTenantId && !subQuery.isLoading && hasWriteAccess && lastBurstTenantId.current !== activeTenantId) {
      lastBurstTenantId.current = activeTenantId;
      burstUpcomingEvents.mutate(undefined, {
        onSuccess: (res) => {
          if (res?.newEventsCount && res.newEventsCount > 0) {
            utils.listIncomeEvents.invalidate();
            utils.listExpenseEvents.invalidate();
            utils.listEnvelopes.invalidate();
          }
        },
        onError: (err) => {
          console.warn('[AppLayout] burstUpcomingEvents failed:', err);
        },
      });
    }
  }, [session?.user, tenantStatusQuery.data?.tenantId, subQuery.data, subQuery.isLoading, burstUpcomingEvents, utils]);

  React.useEffect(() => {
    if (userTenantsQuery.data && userTenantsQuery.data.length > 0) {
      const currentActive = getActiveTenantId();
      const currentTenant = userTenantsQuery.data.find((t) => t.id === currentActive);
      const ownerTenant = userTenantsQuery.data.find((t) => t.role === 'OWNER') || userTenantsQuery.data[0];

      // Auto-heal: If active tenant is missing or invalid, default to owner tenant:
      if (!currentActive || !currentTenant) {
        if (ownerTenant && ownerTenant.id !== currentActive) {
          switchActiveTenant(ownerTenant.id, utils).catch((err) => {
            console.warn('[AppLayout] Auto-switch to owner tenant failed:', err);
          });
        }
      }
    } else if (tenantStatusQuery.data?.tenantId) {
      const currentActive = getActiveTenantId();
      if (currentActive !== tenantStatusQuery.data.tenantId) {
        switchActiveTenant(tenantStatusQuery.data.tenantId, utils).catch((err) => {
          console.warn('[AppLayout] switchActiveTenant failed:', err);
        });
      }
    }
  }, [userTenantsQuery.data, tenantStatusQuery.data?.tenantId, utils]);

  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  // Expired Trial Guard: redirect to settings when trial has ended
  React.useEffect(() => {
    if (subQuery.data?.isTrialExpired && currentScreen !== 'settings' && !segments.includes('settings')) {
      router.replace('/(app)/settings?tab=account-data' as Href);
    }
  }, [subQuery.data?.isTrialExpired, currentScreen, segments, router]);

  // Setup Guard: redirect to complete-profile if no tenant, or setup wizard if setup incomplete
  React.useEffect(() => {
    if (
      session?.user &&
      !tenantStatusQuery.isLoading &&
      tenantStatusQuery.data &&
      !(segments as string[]).includes('(setup)')
    ) {
      if (!tenantStatusQuery.data.hasTenant) {
        router.replace('/(auth)/complete-profile' as Href);
        return;
      }
      if (tenantStatusQuery.data.setupCompleted === false) {
        router.replace('/(setup)/income' as Href);
      }
    }
  }, [session?.user, tenantStatusQuery.isLoading, tenantStatusQuery.data, segments, router]);

  // Automatically register device push token upon authenticated layout mount & handle foreground notifications
  usePushNotifications(
    React.useCallback((notification: { title?: string; body?: string }) => {
      if (notification.title || notification.body) {
        showToast({
          type: 'info',
          title: notification.title || 'Notification',
          message: notification.body || '',
        });
      }
    }, [showToast])
  );

  const isFabHidden =
    currentScreen === 'settings' ||
    currentScreen === 'transfer-instructions' ||
    segments.includes('settings') ||
    segments.includes('(setup)');

  return (
    <MobileProductTourProvider>
    <CommandPaletteProvider>
      <View style={styles.root}>
        <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 56 + Math.max(insets.bottom, 10),
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ],
          tabBarActiveTintColor: DESIGN_TOKENS.colors.accent,
          tabBarInactiveTintColor: DESIGN_TOKENS.colors.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('nav.home'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: t('nav.incomeExpenses'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="envelopes"
          options={{
            title: t('nav.categories'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="layers" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('nav.transactions'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="list" color={color} size={size} />
            ),
          }}
        />

        {/* Hidden push routes — not in tab bar */}
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="bank-accounts" options={{ href: null }} />
        <Tabs.Screen name="payday-plan" options={{ href: null }} />
        <Tabs.Screen name="payday-plan/[id]" options={{ href: null }} />
        <Tabs.Screen name="plan/schedules" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="afford-check" options={{ href: null }} />
        <Tabs.Screen name="envelopes/[id]" options={{ href: null }} />
        <Tabs.Screen name="envelopes/projection" options={{ href: null }} />
        <Tabs.Screen name="settings/allocation-rules" options={{ href: null }} />
        <Tabs.Screen name="settings/notifications" options={{ href: null }} />
        <Tabs.Screen name="settings/archived" options={{ href: null }} />
      </Tabs>

      {/* Floating Action Button */}
      <QuickActionFab
        visible={!isFabHidden}
        onCustomPress={
          currentScreen === 'envelopes'
            ? () => setPoolModalVisible(true)
            : undefined
        }
      />

      {/* Quick New Envelope modal triggered from FAB when on Envelopes screen */}
      <EnvelopeFormModal
        visible={poolModalVisible}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => {
          utils.listEnvelopes.invalidate();
        }}
      />
    </View>
    </CommandPaletteProvider>
    </MobileProductTourProvider>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  tabBar: {
    backgroundColor: D.colors.surface,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});
