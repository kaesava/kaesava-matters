import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardHeroEverydayCard } from './dashboard/hero/DashboardHeroEverydayCard';
import { DashboardHeroBillsCard } from './dashboard/hero/DashboardHeroBillsCard';

export interface DashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly safetyBufferFloor?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly daysUntilPayday?: number;
  readonly hasNextPayday?: boolean;
  readonly safeToSpend?: number;
  readonly dailyPace?: number;
  readonly paceStatus?: "AHEAD" | "ON_TRACK" | "BEHIND" | "CRITICAL" | "AWAITING_FIRST_PAYDAY";
  readonly isAwaitingFirstPayday?: boolean;
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;
  readonly onMoveMoney: () => void;
  readonly onEverydayPress?: () => void;
  readonly onAlignEverydayBalance?: () => void;
  readonly onBillsPress?: () => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  safetyBufferFloor = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  daysUntilPayday,
  hasNextPayday = true,
  safeToSpend,
  dailyPace = 0,
  isAwaitingFirstPayday = false,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onMoveMoney,
  onEverydayPress,
  onAlignEverydayBalance,
  onBillsPress,
}) => {
  const effectiveDays = daysUntilPayday !== undefined ? daysUntilPayday : 14;
  const effectiveSafeToSpend = safeToSpend !== undefined ? safeToSpend : everydayBalance;
  const isBufferDipped = safetyBufferFloor > 0 && everydayBalance < safetyBufferFloor;
  const isBillsRisk = !isAwaitingFirstPayday && billsShortfall > 0;
  const showHeadsUp = !isAwaitingFirstPayday && (isBillsRisk || isBufferDipped);

  return (
    <View style={styles.container}>
      <DashboardHeroEverydayCard
        everydayBalance={everydayBalance}
        safeToSpend={effectiveSafeToSpend}
        everydayMonthlyBudget={everydayMonthlyBudget}
        safetyBufferFloor={safetyBufferFloor}
        dailySpendable={dailyPace}
        effectiveDays={effectiveDays}
        daysUntilPayday={daysUntilPayday}
        hasNextPayday={hasNextPayday}
        isBillsRisk={showHeadsUp}
        isAwaitingFirstPayday={isAwaitingFirstPayday}
        onEverydayPress={onEverydayPress}
        onAlignBalance={onAlignEverydayBalance}
      />

      <DashboardHeroBillsCard
        billsBalance={billsBalance}
        billsMonthlyBudget={billsMonthlyBudget}
        billsShortfall={billsShortfall}
        billsDue14DaysCount={billsDue14DaysCount}
        totalBillsDue14Days={totalBillsDue14Days}
        hasNextPayday={hasNextPayday}
        isAwaitingFirstPayday={isAwaitingFirstPayday}
        onBillsPress={onBillsPress}
        onMoveMoney={onMoveMoney}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
  },
});

export default DashboardHeroCard;
