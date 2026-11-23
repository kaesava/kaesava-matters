import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FormLabel, MobileInput, DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import {
  ACCOUNT_TYPES,
  type AccountType,
  ACCOUNT_TYPE_LABELS,
} from '@kaesava/types';

interface BankAccountInstitutionSelectorProps {
  provider: string;
  setProvider: (p: string) => void;
  accountType: AccountType;
  setAccountType: (t: AccountType) => void;
}

export function BankAccountInstitutionSelector({
  provider,
  setProvider,
  accountType,
  setAccountType,
}: BankAccountInstitutionSelectorProps) {
  return (
    <>
      {/* 1. Bank Institution (Optional Free-Text) */}
      <View style={styles.inputGroup}>
        <MobileInput
          label={t('settings.bankAccountForm.bankProviderLabel')}
          value={provider === 'Other' ? '' : provider}
          onChangeText={(val) => setProvider(val || 'Other')}
          placeholder={t('settings.bankAccountForm.bankProviderPlaceholder')}
          maxLength={50}
        />
      </View>

      {/* 2. Account Type (Required Chips) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.bankAccountForm.accountTypeLabel')} required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersRow}>
          {ACCOUNT_TYPES.map((type) => {
            const isActive = accountType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setAccountType(type)}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 6,
  },
  providersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  typeChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  typeChipTextActive: {
    color: DESIGN_TOKENS.colors.onPrimary,
  },
});
