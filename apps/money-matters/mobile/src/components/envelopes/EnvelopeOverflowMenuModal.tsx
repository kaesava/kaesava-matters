import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@kaesava/i18n';
import { DESIGN_TOKENS, MobileModalDialog } from '@kaesava/ui/mobile';
import { useRouter, type Href } from 'expo-router';

interface EnvelopeOverflowMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onMoveMoney: () => void;
  onQuickExpense?: () => void;
  onQuickIncome?: () => void;
  showExtraActions?: boolean;
}

export function EnvelopeOverflowMenuModal({
  visible,
  onClose,
  onMoveMoney,
  onQuickExpense,
  onQuickIncome,
  showExtraActions = true,
}: EnvelopeOverflowMenuModalProps) {
  const router = useRouter();

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('categories.title')}
    >
      <View style={styles.menuContainer}>
        {onQuickExpense && (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onQuickExpense();
              }}
            >
              <Feather name="arrow-down-circle" size={16} color={DESIGN_TOKENS.colors.success} />
              <Text style={styles.menuItemText}>{t('categories.actions.quickExpense')}</Text>
            </TouchableOpacity>
            <View style={styles.menuItemDivider} />
          </>
        )}

        {onQuickIncome && (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onQuickIncome();
              }}
            >
              <Feather name="arrow-up-circle" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.menuItemText}>{t('categories.actions.quickIncome')}</Text>
            </TouchableOpacity>
            <View style={styles.menuItemDivider} />
          </>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onMoveMoney();
          }}
        >
          <Feather name="repeat" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
          <Text style={styles.menuItemText}>{t('dashboard.moveMoney')}</Text>
        </TouchableOpacity>

        {showExtraActions && (
          <>
            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(app)/envelopes/projection' as Href);
              }}
            >
              <Feather name="trending-up" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              <Text style={styles.menuItemText}>{t('categories.projectionModeTitle')}</Text>
            </TouchableOpacity>

            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } } as Href);
              }}
            >
              <Feather name="settings" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              <Text style={styles.menuItemText}>{t('categories.recalibrateBudget')}</Text>
            </TouchableOpacity>

            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(app)/settings/archived' as Href);
              }}
            >
              <Feather name="archive" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              <Text style={styles.menuItemText}>{t('categories.viewArchived')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    paddingVertical: 6,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuItemText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  menuItemDivider: { height: 1, backgroundColor: DESIGN_TOKENS.colors.slate[100], marginHorizontal: 8 },
});
