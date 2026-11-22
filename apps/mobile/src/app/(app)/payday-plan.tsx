import React, { useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@kaesava/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileHorizonPlanTab } from '../../components/plan/MobileHorizonPlanTab';
import { MobileCategoryDetailSheet, MobileCategoryDetailItem } from "@money-matters/capability-budgeting/mobile";
import { useMobileProductTour } from '../../context/ProductTourContext';

export default function SplitIncomeScreen() {
  const { registerTourTarget } = useMobileProductTour();
  const matrixRef = useRef<View>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: MobileCategoryDetailItem[];
  } | null>(null);

  return (
    <AppScreenWrapper
      title={t('planTabs.twelveMonthIncomeSplit')}
      scrollable={false}
      infoTooltip={{
        title: t('planTabs.twelveMonthIncomeSplit'),
        content: t('planTabs.twelveMonthIncomeSplitTooltip'),
      }}
    >
      <View
        ref={matrixRef}
        style={styles.container}
        onLayout={() => {
          matrixRef.current?.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) registerTourTarget('payday-matrix', { x, y, width, height });
          });
        }}
      >
        <MobileHorizonPlanTab
          onOpenCategoryModal={(params) => {
            setActiveCategoryDetail(params);
            setCategoryModalVisible(true);
          }}
        />

        {activeCategoryDetail && (
          <MobileCategoryDetailSheet
            visible={categoryModalVisible}
            poolId={activeCategoryDetail.poolId}
            poolName={activeCategoryDetail.poolName}
            poolType={activeCategoryDetail.poolType}
            currentBalance={activeCategoryDetail.currentBalance}
            targetAmount={activeCategoryDetail.targetAmount}
            upcomingEvents={activeCategoryDetail.events}
            onClose={() => {
              setCategoryModalVisible(false);
              setActiveCategoryDetail(null);
            }}
          />
        )}
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
