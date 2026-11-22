import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { formatMobileCurrency } from '../../lib/format';

export interface GoalItem {
  id: string;
  name: string;
  currentBalance: number | string;
  targetAmount?: string | number | null;
  monthlyAmount?: string | number | null;
  targetDate?: string | null;
  fundingMode?: 'TARGET_BALANCE' | 'RECURRING' | string | null;
  enteredAmount?: string | null;
  budgetFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | string | null;
  progressPercentage?: number;
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
  createdAt?: string | Date | null;
}

export interface GoalsProgressStripProps {
  goals: GoalItem[];
}

export function GoalsProgressStrip({ goals }: GoalsProgressStripProps) {
  const router = useRouter();

  const totalGoals = goals?.length ?? 0;

  const {
    totalAccumulatedSavings,
    targetDateGoalsCount,
    recurringGoalsCount,
    totalMilestoneBalance,
    totalMilestoneTarget,
    milestonePct,
    monthlyRecurringPace,
    onTrackGoals,
    previewGoals,
  } = useMemo(() => {
    let accSavings = 0;
    let targetCount = 0;
    let recurringCount = 0;
    let milestoneBal = 0;
    let milestoneClampedBal = 0;
    let milestoneTgt = 0;
    let recurringPace = 0;
    let onTrack = 0;

    for (const g of goals ?? []) {
      const bal = typeof g.currentBalance === 'number' ? g.currentBalance : parseFloat(String(g.currentBalance || '0')) || 0;
      accSavings += bal;

      const isRecurring = g.fundingMode === 'RECURRING';
      if (isRecurring) {
        recurringCount += 1;
        const explicitMonthly = parseFloat(String(g.monthlyAmount || '0')) || 0;
        if (explicitMonthly > 0) {
          recurringPace += explicitMonthly;
        } else {
          const rawAmt = parseFloat(String(g.enteredAmount || g.targetAmount || '0')) || 0;
          const freq = g.budgetFrequency;
          if (freq === 'WEEKLY') {
            recurringPace += (rawAmt * 52) / 12;
          } else if (freq === 'FORTNIGHTLY') {
            recurringPace += (rawAmt * 26) / 12;
          } else if (freq === 'ANNUALLY') {
            recurringPace += rawAmt / 12;
          } else {
            recurringPace += rawAmt;
          }
        }
      } else {
        targetCount += 1;
        const tgt = parseFloat(String(g.targetAmount || '0')) || 0;
        milestoneBal += bal;
        milestoneClampedBal += tgt > 0 ? Math.min(Math.max(0, bal), tgt) : Math.max(0, bal);
        milestoneTgt += tgt;
      }

      if (g.healthStatus === 'GREEN' || !g.healthStatus) {
        onTrack += 1;
      }
    }

    const mPct = milestoneTgt > 0 ? Math.min(100, Math.round((milestoneClampedBal / milestoneTgt) * 100)) : 0;

    const sortedPreview = [...(goals ?? [])]
      .sort((a, b) => {
        const rank = (s?: string) => (s === 'RED' ? 0 : s === 'AMBER' ? 1 : 2);
        return rank(a.healthStatus) - rank(b.healthStatus);
      })
      .slice(0, 3);

    return {
      totalAccumulatedSavings: accSavings,
      targetDateGoalsCount: targetCount,
      recurringGoalsCount: recurringCount,
      totalMilestoneBalance: milestoneBal,
      totalMilestoneTarget: milestoneTgt,
      milestonePct: mPct,
      monthlyRecurringPace: recurringPace,
      onTrackGoals: onTrack,
      previewGoals: sortedPreview,
    };
  }, [goals]);

  if (totalGoals === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>{t('dashboard.goals.cardTitle')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/envelopes?type=GOAL' as Href)}
            style={styles.seeAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>{t('dashboard.goals.viewAll')}</Text>
            <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
          </TouchableOpacity>
        </View>
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>{t('dashboard.goals.totalSavedInvested')}</Text>
          <Text style={styles.heroAmount}>{formatMobileCurrency(0)}</Text>
          <Text style={styles.emptySubtitle}>{t('dashboard.goals.noGoalsSubtitle')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/envelopes?type=GOAL' as Href)}
          style={styles.footerRow}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{t('dashboard.goals.addGoalAction')} →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allOnTrack = onTrackGoals === totalGoals;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{t('dashboard.goals.cardTitle')}</Text>
          <View
            style={[
              styles.badge,
              allOnTrack ? styles.badgeSuccess : styles.badgeAmber,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                allOnTrack ? styles.badgeSuccessText : styles.badgeAmberText,
              ]}
            >
              {allOnTrack
                ? t('dashboard.goals.allOnTrack', { total: totalGoals })
                : t('dashboard.goals.onTrack', {
                    count: onTrackGoals,
                    total: totalGoals,
                  })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(app)/envelopes?type=GOAL' as Href)}
          style={styles.seeAllBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{t('dashboard.goals.viewAll')}</Text>
          <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Hero Metric */}
      <View style={styles.heroSection}>
        <Text style={styles.heroSubtitle}>{t('dashboard.goals.totalSavedInvested')}</Text>
        <Text style={styles.heroAmount}>{formatMobileCurrency(totalAccumulatedSavings)}</Text>
      </View>

      {/* Target Milestone Progress */}
      {targetDateGoalsCount > 0 && (
        <View style={styles.milestoneSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.milestoneTitle}>{t('dashboard.goals.targetDateLabel')}</Text>
            <Text style={styles.milestoneMetric}>
              {t('dashboard.goals.milestonesFunded', {
                funded: formatMobileCurrency(totalMilestoneBalance),
                target: formatMobileCurrency(totalMilestoneTarget),
                percent: milestonePct,
              })}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${milestonePct}%` }]} />
          </View>
        </View>
      )}

      {/* Recurring Ongoing Pace */}
      {recurringGoalsCount > 0 && (
        <View style={styles.recurringRow}>
          <Text style={styles.recurringLabel}>{t('dashboard.goals.ongoingPill')}</Text>
          <View style={styles.recurringBadge}>
            <Text style={styles.recurringAmount}>
              {t('dashboard.goals.recurringPace', {
                amount: formatMobileCurrency(monthlyRecurringPace),
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Top Goals Preview */}
      <View style={styles.footerRow}>
        {previewGoals.map((g) => {
          const bal = typeof g.currentBalance === 'number' ? g.currentBalance : parseFloat(String(g.currentBalance || '0')) || 0;
          const tgt = parseFloat(String(g.targetAmount || '0')) || 0;
          const pct = tgt > 0 && g.fundingMode !== 'RECURRING' ? Math.min(100, Math.round((bal / tgt) * 100)) : null;
          const dotColor =
            g.healthStatus === 'RED'
              ? '#ef4444'
              : g.healthStatus === 'AMBER'
              ? '#f59e0b'
              : '#10b981';
          return (
            <View key={g.id} style={styles.previewRow}>
              <View style={styles.previewLeft}>
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                <Text style={styles.previewName} numberOfLines={1}>{g.name}</Text>
              </View>
              <Text style={styles.previewVal}>
                {pct !== null ? `${formatMobileCurrency(bal)} (${pct}%)` : formatMobileCurrency(bal)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  badgeSuccessText: {
    color: '#15803D',
  },
  badgeAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeAmberText: {
    color: '#B45309',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  heroSection: {
    paddingVertical: 2,
    gap: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  milestoneSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  milestoneMetric: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 4,
  },
  recurringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  recurringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  recurringBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurringAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  footerRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    gap: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewName: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
    flex: 1,
  },
  previewVal: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
});

export default GoalsProgressStrip;
