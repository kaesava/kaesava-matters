import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MobileModalDialog,
  FormErrorBanner,
  useMobileToast,
  showMobileConfirm,
} from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { formatIsoDate } from '../../lib/format';
import { trpc } from '../../lib/trpc';
import { CrossBankTransferModal } from '../CrossBankTransferModal';
import { TransferFormFields } from './transfer/TransferFormFields';
import { TransferModalActions } from './transfer/TransferModalActions';

export interface TransferEventData {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
}

export interface PoolOption {
  id: string;
  name: string;
  poolType?: string;
  currentBalance?: string | number | null;
  isPrivate?: boolean | null;
  bankAccountId?: string | null;
}

export interface MobileTransferModalProps {
  visible: boolean;
  transfer: TransferEventData | null;
  pools: PoolOption[];
  onClose: () => void;
  onSaveDraft?: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
    sourcePoolId?: string;
    destinationPoolId?: string;
  }) => Promise<void>;
  onExecute?: (
    eventId: string,
    amount: string,
    name?: string,
    sourcePoolId?: string,
    destinationPoolId?: string
  ) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function MobileTransferModal({
  visible,
  transfer,
  pools,
  onClose,
  onSaveDraft,
  onExecute,
  onDelete,
}: MobileTransferModalProps) {
  const toast = useMobileToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => formatIsoDate(new Date()));
  const [sourcePoolId, setSourcePoolId] = useState<string>('');
  const [destinationPoolId, setDestinationPoolId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [crossBankPrompt, setCrossBankPrompt] = useState<{
    sourceAccountName: string;
    destAccountName: string;
    amount: number;
    payId?: string | null;
    bsb?: string | null;
    accountNumber?: string | null;
  } | null>(null);
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  useEffect(() => {
    if (transfer && visible) {
      setName(transfer.name || t('common.transfer'));
      setAmount(parseFloat(transfer.expectedAmount || '0').toFixed(2));
      setExpectedDate(formatIsoDate(transfer.expectedDate || new Date()));
      setSourcePoolId(transfer.sourcePoolId || '');
      setDestinationPoolId(transfer.destinationPoolId || '');
      setErrorMsg('');
    }
  }, [transfer, visible]);

  if (!visible || !transfer) return null;

  const validate = (): number | null => {
    const numAmt = parseFloat(amount);
    if (!name.trim()) {
      setErrorMsg(t('drawers.quickExpense.nameRequired'));
      return null;
    }
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg(t('drawers.quickExpense.invalidAmount'));
      return null;
    }
    if (sourcePoolId && destinationPoolId && sourcePoolId === destinationPoolId) {
      setErrorMsg(t('drawers.quickExpense.envelopesDifferent'));
      return null;
    }
    return numAmt;
  };

  const handleSave = async () => {
    const numAmt = validate();
    if (numAmt === null) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      if (onSaveDraft) {
        await onSaveDraft({
          eventId: transfer.id,
          name: name.trim(),
          amount: numAmt.toFixed(2),
          expectedDate,
          sourcePoolId: sourcePoolId || undefined,
          destinationPoolId: destinationPoolId || undefined,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteNow = async () => {
    const numAmt = validate();
    if (numAmt === null) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      if (onExecute) {
        await onExecute(
          transfer.id,
          numAmt.toFixed(2),
          name.trim(),
          sourcePoolId || undefined,
          destinationPoolId || undefined
        );
      }
      const srcPool = pools.find((p) => p.id === sourcePoolId);
      const dstPool = pools.find((p) => p.id === destinationPoolId);
      if (srcPool?.bankAccountId && dstPool?.bankAccountId && srcPool.bankAccountId !== dstPool.bankAccountId) {
        const srcBank = bankAccounts.find((b) => b.id === srcPool.bankAccountId);
        const dstBank = bankAccounts.find((b) => b.id === dstPool.bankAccountId);
        if (srcBank && dstBank) {
          setCrossBankPrompt({
            sourceAccountName: srcBank.name,
            destAccountName: dstBank.name,
            amount: numAmt,
          });
          return;
        }
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    showMobileConfirm({
      title: t('home.deleteTransferTitle'),
      message: t('home.deleteTransferMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          if (onDelete) {
            await onDelete(transfer.id);
          }
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const isDirty = Boolean(
    transfer && (
      name !== (transfer.name || t('common.transfer')) ||
      amount !== parseFloat(transfer.expectedAmount || '0').toFixed(2) ||
      expectedDate !== formatIsoDate(transfer.expectedDate || new Date()) ||
      sourcePoolId !== (transfer.sourcePoolId || '') ||
      destinationPoolId !== (transfer.destinationPoolId || '')
    )
  );

  return (
    <>
      <MobileModalDialog
        visible={visible && !crossBankPrompt}
        onClose={onClose}
        isDirty={isDirty}
        title={t('common.transfer')}
        subtitle={transfer.name || undefined}
      >
        <View style={styles.formContainer}>
          <FormErrorBanner message={errorMsg} />

          <TransferFormFields
            name={name}
            setName={setName}
            amount={amount}
            setAmount={setAmount}
            expectedDate={expectedDate}
            setExpectedDate={setExpectedDate}
            sourcePoolId={sourcePoolId}
            setSourcePoolId={setSourcePoolId}
            destinationPoolId={destinationPoolId}
            setDestinationPoolId={setDestinationPoolId}
            pools={pools}
            onFieldChange={() => {
              if (errorMsg) setErrorMsg('');
            }}
          />

          <TransferModalActions
            submitting={submitting}
            onSaveDraft={handleSave}
            onExecuteNow={handleExecuteNow}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </View>
      </MobileModalDialog>

      {crossBankPrompt && (
        <CrossBankTransferModal
          visible={true}
          onClose={() => {
            setCrossBankPrompt(null);
            onClose();
          }}
          sourceAccountName={crossBankPrompt.sourceAccountName}
          destAccountName={crossBankPrompt.destAccountName}
          amount={crossBankPrompt.amount}
          payId={crossBankPrompt.payId}
          bsb={crossBankPrompt.bsb}
          accountNumber={crossBankPrompt.accountNumber}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 12,
    paddingBottom: 8,
  },
});
