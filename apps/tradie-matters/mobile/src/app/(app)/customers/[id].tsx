import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  EmailActionLink,
  MobileButton,
  MobileDetailLinkRow,
  MobileSkeletonCard,
  PhoneActionLink,
  ReadOnlyField,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { CustomerFormModal } from "../../../components/customers/CustomerFormModal";
import { SiteFormModal } from "../../../components/customers/SiteFormModal";
import { formatMobileCurrency } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);

  const historyQuery = trpc.customers.getHistory.useQuery({ id: id ?? "" }, { enabled: Boolean(id) });
  const data = historyQuery.data;

  return (
    <TradieWorkspaceShell
      title={data?.customer.name ?? t("tradieCrm.customersTitle")}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
        {historyQuery.isLoading || !data ? (
          <MobileSkeletonCard />
        ) : (
          <>
            <SettingsCard title={data.customer.name}>
              {data.customer.companyName ? (
                <ReadOnlyField label={t("tradieCrm.companyNameLabel")} value={data.customer.companyName} />
              ) : null}
              <ReadOnlyField label={t("tradieCrm.customerTypeLabel")} value={data.customer.customerType} />
              <ReadOnlyField
                label={t("tradieCrm.creditBalanceLabel")}
                value={formatMobileCurrency(data.customer.creditBalance ?? "0")}
              />
              {data.customer.mobile ?? data.customer.phone ? (
                <PhoneActionLink phone={data.customer.mobile ?? data.customer.phone ?? ""} />
              ) : null}
              {data.customer.email ? <EmailActionLink email={data.customer.email} /> : null}
              <MobileButton title={t("tradieCrm.editCustomerAction")} variant="secondary" onPress={() => setEditOpen(true)} />
            </SettingsCard>
            <SettingsCard title={t("tradieCrm.sitesTitle")}>
              {data.sites.length === 0 ? (
                <Text style={styles.empty}>{t("tradieMobile.emptySites")}</Text>
              ) : (
                data.sites.map((s) => (
                  <ReadOnlyField
                    key={s.linkId}
                    label={s.site.name}
                    value={[s.site.addressLine1, s.site.suburb, s.site.state].filter(Boolean).join(", ")}
                  />
                ))
              )}
              <MobileButton title={t("tradieCrm.addSiteAction")} variant="secondary" onPress={() => setSiteOpen(true)} />
            </SettingsCard>
            <SettingsCard title={t("tradieCrm.historyTitle")}>
              {data.jobs.length === 0 ? (
                <Text style={styles.empty}>{t("tradieMobile.emptyJobsHistory")}</Text>
              ) : (
                data.jobs.map((job) => (
                  <MobileDetailLinkRow
                    key={job.id}
                    label={`${job.jobNumber} · ${job.title}`}
                    value={job.status}
                    onPress={() => router.push(`/(app)/jobs/${job.id}` as Href)}
                  />
                ))
              )}
            </SettingsCard>
          </>
        )}
      </View>
      {data ? <CustomerFormModal visible={editOpen} onClose={() => setEditOpen(false)} initial={data.customer} /> : null}
      {id ? <SiteFormModal visible={siteOpen} customerId={id} onClose={() => setSiteOpen(false)} /> : null}
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
