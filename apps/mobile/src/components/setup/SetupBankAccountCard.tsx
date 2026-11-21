import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, AmountInput, SwitchRow, MobileInput } from '@money-matters/ui/mobile';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  AccountType,
  computeAccountAvailability,
} from '@money-matters/types';
import { MobileBankAccountItem } from '../../context/setup-wizard-types';
import { formatMobileCurrency } from '../../lib/format';

interface SetupBankAccountCardProps {
  acc: MobileBankAccountItem;
  index: number;
  totalCount: number;
  onFieldChange: (
    acc: MobileBankAccountItem,
    field: 'name' | 'bankProvider' | 'accountType' | 'lastKnownBalance' | 'unbudgetedBuffer' | 'isPrivate',
    value: string | boolean
  ) => void;
  onRemove: (id: string, name: string) => void;
}

export function SetupBankAccountCard({
  acc,
  index: _index,
  totalCount,
  onFieldChange,
  onRemove,
}: SetupBankAccountCardProps) {
  const { actualBalance, buffer, available } = computeAccountAvailability(
    String(acc.lastKnownBalance || '0.00'),
    String(acc.unbudgetedBuffer || '0.00')
  );
  const isBufferInvalid = buffer > actualBalance;
  const isSoleAccount = totalCount <= 1;

  const handleProviderChange = (newProvider: string) => {
    onFieldChange(acc, 'bankProvider', newProvider || 'Other');
  };

  const handleTypeChange = (newType: AccountType) => {
    onFieldChange(acc, 'accountType', newType);
  };

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountCardHeader}>
        <Text style={styles.accountIndexLabel}>
          {acc.name.trim() || t('settings.bankAccounts.addAccount')}
        </Text>
        {!isSoleAccount && (
          <TouchableOpacity onPress={() => onRemove(acc.id, acc.name)}>
            <Text style={styles.removeText}>{t('common.remove')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bankProviderLabel')}</Text>
        <MobileInput containerStyle={{ marginBottom: 0 }}
          value={acc.bankProvider === 'Other' ? '' : acc.bankProvider || ''}
          onChangeText={handleProviderChange}
          placeholder={t('settings.bankAccountForm.bankProviderPlaceholder')}
          maxLength={50}
          style={styles.textInput}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountTypeLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {ACCOUNT_TYPES.map((at) => {
            const isSelected = (acc.accountType || 'EVERYDAY') === at;
            return (
              <TouchableOpacity
                key={at}
                onPress={() => handleTypeChange(at)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {ACCOUNT_TYPE_LABELS[at]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountNameLabel')}</Text>
        <MobileInput containerStyle={{ marginBottom: 0 }}
          value={acc.name}
          onChangeText={(val) => onFieldChange(acc, 'name', val)}
          placeholder={t('setup.bankAccountsStep.accountNamePlaceholder')}
          style={styles.textInput}
        />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.flexOne}>
          <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.balanceLabel')}</Text>
          <AmountInput
            value={String(acc.lastKnownBalance || '0.00')}
            onChangeText={(val) => {
              onFieldChange(acc, 'lastKnownBalance', val);
              const newBal = parseFloat(val) || 0;
              const currentBuf = parseFloat(String(acc.unbudgetedBuffer || '0')) || 0;
              if (currentBuf > newBal) {
                onFieldChange(acc, 'unbudgetedBuffer', String(newBal));
              }
            }}
          />
        </View>
        <View style={styles.flexOne}>
          <View style={styles.labelWithTooltip}>
            <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bufferLabel')}</Text>
            <InfoTooltip content={t('setup.bankAccountsStep.reservedFundsTooltip')} />
          </View>
          <AmountInput
            value={String(acc.unbudgetedBuffer || '0.00')}
            onChangeText={(val) => {
              const numVal = parseFloat(val) || 0;
              if (numVal > actualBalance) {
                onFieldChange(acc, 'unbudgetedBuffer', String(actualBalance));
              } else {
                onFieldChange(acc, 'unbudgetedBuffer', val);
              }
            }}
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.availableBox}>
          <Text style={styles.availableLabel}>{t('bankAccounts.availableLabel')}:</Text>
          <Text style={[styles.availableAmount, isBufferInvalid && styles.textError]}>
            {formatMobileCurrency(available)}
          </Text>
        </View>

        <SwitchRow
          label={t('settings.bankAccountForm.privacyLabel')}
          infoTooltip={
            isSoleAccount
              ? t('setup.bankAccountsStep.singleAccountPrivateDisabledTooltip')
              : t('settings.bankAccountForm.privacyHint')
          }
          value={Boolean(acc.isPrivate) && !isSoleAccount}
          disabled={isSoleAccount}
          onValueChange={(val) => onFieldChange(acc, 'isPrivate', val)}
          noBorder
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accountCard: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], padding: 14, gap: 12 },
  accountCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountIndexLabel: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  removeText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.critical },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[500] },
  chipsRow: { gap: 6, paddingVertical: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.sereneBlue, borderColor: DESIGN_TOKENS.colors.sereneBlue },
  chipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  textInput: { height: 40, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, fontSize: 13, fontWeight: '600', backgroundColor: '#FFFFFF', color: '#1E293B' },
  amountsRow: { flexDirection: 'row', gap: 12 },
  flexOne: { flex: 1 },
  labelWithTooltip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  availableBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availableLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  availableAmount: { fontSize: 12, fontWeight: '800', color: DESIGN_TOKENS.colors.successDark },
  textError: { color: DESIGN_TOKENS.colors.critical },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privacyLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  textMuted: { color: DESIGN_TOKENS.colors.slate[400] },
});
