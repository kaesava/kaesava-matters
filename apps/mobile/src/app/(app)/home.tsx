import React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS, MobileLogo, showMobileConfirm } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { MobileNextPaydayCard } from '../../components/dashboard/MobileNextPaydayCard';
import { AttentionItemsList } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MarkPaidModal } from '../../components/MarkPaidModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { MobileAffordCheckModal } from '../../components/afford-check/MobileAffordCheckModal';
import { MobileSyncBalanceModal } from '../../components/envelopes/MobileSyncBalanceModal';
import { useHomeData } from '../../components/dashboard/useHomeData';
import { useHomeModals } from '../../components/dashboard/useHomeModals';
import { useMobileProductTour } from '../../context/ProductTourContext';
import { useAppFeatures } from '../../context/useAppFeatures';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();
  const { hasSimulation } = useAppFeatures();
  const { registerTourTarget } = useMobileProductTour();
  const heroRef = React.useRef<View>(null);
  const paydayRef = React.useRef<View>(null);
  const attentionRef = React.useRef<View>(null);

  const {
    refreshing,
    onRefresh,
    pools,
    bankAccounts,
    homeSummary,
    safeToSpend,
    dailyPace,
    paceStatus,
    everydayBalance,
    everydayMonthlyBudget,
    everydaySafetyBuffer,
    billsBalance,
    billsMonthlyBudget,
    daysUntilPayday,
    hasNextPayday,
    billsShortfall,
    billsDue14DaysCount,
    totalBillsDue14Days,
    upcomingIncomeList,
    attentionItems,
    goalsList,
    everydayPool,
    billsPool,
    executeTransferMutation,
    deleteTransferMutation,
    deleteExpenseMutation,
    deleteIncomeMutation,
    refetchAll,
  } = useHomeData(token);

  const {
    quickModalVisible,
    setQuickModalVisible,
    quickModalType,
    quickModalData,
    affordModalVisible,
    setAffordModalVisible,
    affordModalAmount,
    markPaidEvent,
    setMarkPaidEvent,
    reconcileAccount,
    setReconcileAccount,
    openQuickModal,
    handleOpenEverydayReconciliation,
  } = useHomeModals(pools, bankAccounts, everydayPool);


  return (
    <AppScreenWrapper
      title={t('dashboard.title')}
      scrollable={false}
    >
      <TrialBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN_TOKENS.colors.sereneBlue}
          />
        }
      >
        <View style={styles.homeHeader}>
          <MobileLogo size={52} style={{ marginBottom: 0 }} />
          <View style={styles.homeHeaderText}>
            <Text style={styles.homeHeaderTitle}>{t('dashboard.title')}</Text>
            <Text style={styles.homeHeaderTagline} numberOfLines={2}>
              {t('app.tagline')}
            </Text>
          </View>
        </View>

        <View
          ref={heroRef}
          onLayout={() => {
            heroRef.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) registerTourTarget('envelopes-row', { x, y, width, height });
            });
          }}
        >
          <DashboardHeroCard
            everydayBalance={everydayBalance}
            everydayMonthlyBudget={everydayMonthlyBudget}
            safetyBufferFloor={everydaySafetyBuffer}
            billsBalance={billsBalance}
            billsMonthlyBudget={billsMonthlyBudget}
            daysUntilPayday={daysUntilPayday}
            hasNextPayday={hasNextPayday}
            safeToSpend={safeToSpend}
            dailyPace={dailyPace}
            paceStatus={paceStatus}
            isAwaitingFirstPayday={homeSummary?.isAwaitingFirstPayday}
            billsShortfall={billsShortfall}
            billsDue14DaysCount={billsDue14DaysCount}
            totalBillsDue14Days={totalBillsDue14Days}
            onMoveMoney={() => openQuickModal('TRANSFER')}
            onEverydayPress={() =>
              everydayPool
                ? router.push(`/(app)/envelopes/${everydayPool.id}` as Href)
                : router.push('/(app)/envelopes' as Href)
            }
            onAlignEverydayBalance={handleOpenEverydayReconciliation}
            onBillsPress={() =>
              billsPool
                ? router.push(`/(app)/envelopes/${billsPool.id}` as Href)
                : router.push('/(app)/envelopes' as Href)
            }
          />
        </View>

        <View
          ref={paydayRef}
          onLayout={() => {
            paydayRef.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) registerTourTarget('payday-card', { x, y, width, height });
            });
          }}
        >
          <MobileNextPaydayCard
            upcomingIncomes={upcomingIncomeList}
            onPressRunSplit={(id: string) => {
              if (posthog) posthog.capture('payday_wizard_opened');
              router.push(`/(app)/payday-plan/${id}` as Href);
            }}
            onDeleteIncome={(id: string) => {
              const matched = upcomingIncomeList.find((item) => item.id === id);
              showMobileConfirm({
                title: t('common.deleteIncomeTitle'),
                message: t('common.deleteConfirmNamed', { name: matched?.name || t('common.income') }),
                confirmText: t('common.delete'),
                isDestructive: true,
                onConfirm: () => deleteIncomeMutation.mutate({ eventId: id }),
              });
            }}
          />
        </View>

        <View
          ref={attentionRef}
          onLayout={() => {
            attentionRef.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) registerTourTarget('afford-check', { x, y, width, height });
            });
          }}
        >
          <AttentionItemsList
          items={attentionItems}
          needsBankReconciliation={bankAccounts.some(
            (b) => !b.updatedAt || Date.now() - new Date(b.updatedAt).getTime() > 14 * 86400000
          )}
          onOpenSyncBalance={handleOpenEverydayReconciliation}
          onTopUpShortfall={(item) =>
            openQuickModal('TRANSFER', {
              destinationPoolId: item.categoryId || undefined,
              amount: String(Math.max(0, item.expectedAmount - (item.categoryBalance ?? 0)).toFixed(2)),
            })
          }
          onMarkPaid={(item) =>
            setMarkPaidEvent({
              id: item.id,
              name: item.name,
              expectedAmount: item.expectedAmount,
              expectedDate: item.expectedDate,
              categoryId: item.categoryId,
            })
          }
          onSkipExpense={(item) =>
            showMobileConfirm({
              title: t('common.deleteExpenseTitle'),
              message: t('common.deleteConfirmNamed', { name: item.name }),
              confirmText: t('common.delete'),
              isDestructive: true,
              onConfirm: () => deleteExpenseMutation.mutate({ eventId: item.id }),
            })
          }
          onExecuteTransfer={(item) =>
            executeTransferMutation.mutate({ eventId: item.id })
          }
          onDeleteTransfer={(item) =>
            showMobileConfirm({
              title: t('modals.transfer.deleteConfirmTitle'),
              message: t('modals.transfer.deletePrompt'),
              confirmText: t('common.delete'),
              isDestructive: true,
              onConfirm: () => deleteTransferMutation.mutate({ eventId: item.id }),
            })
          }
        />
        </View>

        {goalsList.length > 0 && (
          <GoalsProgressStrip goals={goalsList} />
        )}
      </ScrollView>

      {/* Quick Action Drawer */}
      <QuickExpenseModal
        visible={quickModalVisible}
        initialType={quickModalType}
        initialData={quickModalData}
        onClose={() => setQuickModalVisible(false)}
        onSuccess={() => refetchAll()}
      />

      {/* Affordability Check Modal */}
      {hasSimulation && (
        <MobileAffordCheckModal
          visible={affordModalVisible}
          onClose={() => setAffordModalVisible(false)}
          initialAmount={affordModalAmount}
        />
      )}

      {/* Reconciliation Modal */}
      {reconcileAccount && (
        <MobileSyncBalanceModal
          visible={true}
          account={reconcileAccount}
          onClose={() => setReconcileAccount(null)}
          onSuccess={() => {
            setReconcileAccount(null);
            refetchAll();
          }}
        />
      )}

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={Boolean(markPaidEvent)}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          setMarkPaidEvent(null);
          refetchAll();
        }}
        onOpenTransferModal={({ destinationPoolId, shortfallAmount }) => {
          openQuickModal('TRANSFER', {
            type: 'TRANSFER',
            destinationPoolId,
            amount: shortfallAmount > 0 ? shortfallAmount.toFixed(2) : undefined,
          });
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  homeHeaderText: {
    flex: 1,
    gap: 2,
  },
  homeHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textPrimary,
    letterSpacing: -0.4,
  },
  homeHeaderTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});
