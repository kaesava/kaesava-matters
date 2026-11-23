import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@kaesava/i18n';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileBankAccountsSection } from '../../components/settings/MobileBankAccountsSection';
import { useMobileProductTour } from '../../context/ProductTourContext';

export default function BankAccountsScreen() {
  const router = useRouter();
  const { registerTourTarget } = useMobileProductTour();

  return (
    <AppScreenWrapper
      title={t('settings.bankAccounts.title')}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) registerTourTarget('bank-accounts', { x, y, width, height });
          }}
        >
          <MobileBankAccountsSection />
        </View>
      </ScrollView>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
});
