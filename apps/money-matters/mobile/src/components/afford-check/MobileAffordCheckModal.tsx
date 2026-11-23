import React, { useState, useDeferredValue } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog, AmountInput, SwitchRow, MobileInput } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { trpc } from '../../lib/trpc';
import { getMobileLocaleConfig } from '../../lib/format';
import { AffordCheckVerdictCard } from './AffordCheckVerdictCard';
import { AffordCheckBreakdownCard } from './AffordCheckBreakdownCard';

interface MobileAffordCheckModalProps {
  visible: boolean;
  onClose: () => void;
  initialAmount?: string;
}

export function MobileAffordCheckModal({ visible, onClose, initialAmount }: MobileAffordCheckModalProps) {
  const [rawAmount, setRawAmount] = useState(initialAmount || '');
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [itemName, setItemName] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);

  React.useEffect(() => {
    if (visible && initialAmount) {
      setRawAmount(initialAmount);
    }
  }, [visible, initialAmount]);

  const deferredAmount = useDeferredValue(rawAmount);
  const parsedAmount = parseFloat(deferredAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading } = trpc.canAfford.useQuery(
    {
      amount: deferredAmount,
      mode,
      frequency,
      itemName: itemName.trim() || undefined,
      includePersonal,
      locale: getMobileLocaleConfig().locale,
    },
    {
      enabled: isValidAmount,
    }
  );

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('canIAfford.title')}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'ONE_OFF' && styles.tabBtnActive]}
            onPress={() => setMode('ONE_OFF')}
            activeOpacity={0.8}
          >
            <Feather
              name="shopping-bag"
              size={14}
              color={mode === 'ONE_OFF' ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.slate[500]}
            />
            <Text style={[styles.tabBtnText, mode === 'ONE_OFF' && styles.tabBtnTextActive]}>
              {t('canIAfford.modeOneOff')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === 'RECURRING' && styles.tabBtnActive]}
            onPress={() => setMode('RECURRING')}
            activeOpacity={0.8}
          >
            <Feather
              name="repeat"
              size={14}
              color={mode === 'RECURRING' ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.slate[500]}
            />
            <Text style={[styles.tabBtnText, mode === 'RECURRING' && styles.tabBtnTextActive]}>
              {t('canIAfford.modeRecurring')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={styles.inputCard}>
          <AmountInput
            label={mode === 'ONE_OFF' ? t('canIAfford.purchaseAmount') : t('canIAfford.recurringAmount')}
            value={rawAmount}
            onChangeText={setRawAmount}
            required
            autoFocus
          />

          {mode === 'RECURRING' && (
            <View style={styles.freqContainer}>
              <Text style={styles.freqLabel}>{t('forms.frequency')}</Text>
              <View style={styles.freqGrid}>
                {(
                  [
                    ['WEEKLY', t('forms.weekly')],
                    ['FORTNIGHTLY', t('forms.fortnightly')],
                    ['MONTHLY', t('forms.monthly')],
                    ['ANNUALLY', t('canIAfford.freqAnnually')],
                  ] as const
                ).map(([freq, label]) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    style={[styles.freqChip, frequency === freq && styles.freqChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.freqChipText, frequency === freq && styles.freqChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('canIAfford.itemNameLabel')}</Text>
            <MobileInput containerStyle={{ marginBottom: 0 }}
              style={styles.textInput}
              placeholder={t('canIAfford.itemNamePlaceholder')}
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
              maxLength={100}
            />
          </View>

          <SwitchRow
            label={t('canIAfford.includePersonal')}
            hint={t('canIAfford.includePersonalSubtext')}
            value={includePersonal}
            onValueChange={setIncludePersonal}
            noBorder
          />
        </View>

        {/* Verdict Result */}
        {isValidAmount && (
          <View style={styles.results}>
            {isLoading && (
              <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={{ padding: 16 }} />
            )}
            {data && (
              <View style={{ gap: 12 }}>
                <AffordCheckVerdictCard data={data} />
                <AffordCheckBreakdownCard data={data} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  tabBtnTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  inputCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  freqContainer: {
    gap: 6,
  },
  freqLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  freqChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  freqChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqChipTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  results: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: DESIGN_TOKENS.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  switchSubtext: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 1,
  },
  flex1: {
    flex: 1,
  },
});
