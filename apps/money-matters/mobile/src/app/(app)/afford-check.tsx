import React, { useState, useDeferredValue, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper, FormErrorBanner } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { trpc } from '../../lib/trpc';
import { getMobileLocaleConfig } from '../../lib/format';
import { useAppFeatures } from '../../context/useAppFeatures';
import { AffordCheckInputControls } from '../../components/afford-check/AffordCheckInputControls';
import { AffordCheckVerdictCard } from '../../components/afford-check/AffordCheckVerdictCard';
import { AffordCheckBreakdownCard } from '../../components/afford-check/AffordCheckBreakdownCard';

export default function AffordCheckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string }>();
  const { hasSimulation, isLoading: isFeaturesLoading } = useAppFeatures();

  useEffect(() => {
    if (!isFeaturesLoading && !hasSimulation) {
      router.replace('/(app)/home' as Href);
    }
  }, [hasSimulation, isFeaturesLoading, router]);

  const [rawAmount, setRawAmount] = useState(params.amount || '');
  useEffect(() => {
    if (params.amount) setRawAmount(params.amount);
  }, [params.amount]);
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<
    'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'
  >('MONTHLY');
  const [itemName, setItemName] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);

  const deferredAmount = useDeferredValue(rawAmount);
  const parsedAmount = parseFloat(deferredAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading, isError, error } = trpc.canAfford.useQuery(
    {
      amount: deferredAmount,
      mode,
      frequency,
      itemName: itemName.trim() || undefined,
      includePersonal,
      locale: getMobileLocaleConfig().locale,
    },
    {
      enabled: isValidAmount && hasSimulation,
    }
  );

  if (!isFeaturesLoading && !hasSimulation) {
    return (
      <MobileScreenWrapper title={t('canIAfford.title')} showBack onBackPress={() => router.back()}>
        <View style={styles.container}>
          <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} style={styles.loadingIndicator} />
        </View>
      </MobileScreenWrapper>
    );
  }

  const handleAmountChange = (text: string) => {
    if (text === '' || /^\d{0,12}(\.\d{0,2})?$/.test(text)) {
      setRawAmount(text);
    }
  };

  const handleAmountBlur = () => {
    if (rawAmount !== '') {
      const num = parseFloat(rawAmount);
      if (!isNaN(num) && num > 0) {
        setRawAmount(num.toFixed(2));
      }
    }
  };

  return (
    <MobileScreenWrapper
      title={t('canIAfford.title')}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <AffordCheckInputControls
          mode={mode}
          setMode={setMode}
          frequency={frequency}
          setFrequency={setFrequency}
          itemName={itemName}
          setItemName={setItemName}
          rawAmount={rawAmount}
          onAmountChange={handleAmountChange}
          onAmountBlur={handleAmountBlur}
          includePersonal={includePersonal}
          setIncludePersonal={setIncludePersonal}
        />

        {isError && isValidAmount ? (
          <FormErrorBanner message={error?.message || t('common.errorTryAgain')} />
        ) : isLoading && isValidAmount ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={styles.loadingIndicator} />
        ) : data ? (
          <View style={styles.resultSection}>
            <AffordCheckVerdictCard data={data} />
            <AffordCheckBreakdownCard data={data} />
            <Text style={styles.horizonNote}>{t('canIAfford.horizonNote')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  loadingIndicator: {
    marginVertical: 30,
  },
  resultSection: {
    gap: 14,
    marginTop: 8,
  },
  horizonNote: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    textAlign: 'center',
    marginTop: 4,
  },
});
