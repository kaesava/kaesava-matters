import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MobileDatePickerField,
  AmountInput,
  MobileInput,
  MobileEnvelopePicker,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type { PoolOption } from '../MobileTransferModal';

interface TransferFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  expectedDate: string;
  setExpectedDate: (v: string) => void;
  sourcePoolId: string;
  setSourcePoolId: (id: string) => void;
  destinationPoolId: string;
  setDestinationPoolId: (id: string) => void;
  pools: PoolOption[];
  onFieldChange: () => void;
}

export const TransferFormFields: React.FC<TransferFormFieldsProps> = ({
  name,
  setName,
  amount,
  setAmount,
  expectedDate,
  setExpectedDate,
  sourcePoolId,
  setSourcePoolId,
  destinationPoolId,
  setDestinationPoolId,
  pools,
  onFieldChange,
}) => {
  const formattedPools = pools.map((p) => ({
    id: p.id,
    name: p.name,
    poolType: p.poolType,
    currentBalance: p.currentBalance ?? undefined,
    isPrivate: p.isPrivate,
  }));

  return (
    <View style={styles.container}>
      <MobileInput
        label={t('common.name')}
        required
        value={name}
        onChangeText={(v) => {
          setName(v);
          onFieldChange();
        }}
        placeholder={t('common.transfer')}
      />

      <AmountInput
        label={t('common.amount')}
        required
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          onFieldChange();
        }}
      />

      <MobileDatePickerField
        label={t('common.date')}
        required
        value={expectedDate}
        onChange={(v) => {
          setExpectedDate(v);
          onFieldChange();
        }}
      />

      <MobileEnvelopePicker
        label={t('drawers.quickExpense.fromEnvelope')}
        required
        displayStyle="field"
        mode="inline"
        pools={formattedPools}
        selectedPoolId={sourcePoolId}
        allowCategorySelection={false}
        placeholder={t('common.selectEnvelope')}
        onSelectPool={(pId) => {
          setSourcePoolId(pId);
          onFieldChange();
        }}
      />

      <MobileEnvelopePicker
        label={t('drawers.quickExpense.toEnvelopeDestination')}
        required
        displayStyle="field"
        mode="inline"
        pools={formattedPools}
        selectedPoolId={destinationPoolId}
        allowCategorySelection={false}
        placeholder={t('common.selectEnvelope')}
        onSelectPool={(pId) => {
          setDestinationPoolId(pId);
          onFieldChange();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
