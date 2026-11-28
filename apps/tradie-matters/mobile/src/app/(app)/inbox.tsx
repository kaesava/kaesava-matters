import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileBadge,
  MobileButton,
  MobileSegmentedTabs,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { InboxLeadCard } from "../../components/inbox/InboxLeadCard";
import { SmsThreadModal, type SmsThreadTarget } from "../../components/inbox/SmsThreadModal";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

export default function InboxScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [tab, setTab] = useState("LEADS");
  const [threadTarget, setThreadTarget] = useState<SmsThreadTarget | null>(null);

  const creditQuery = trpc.sms.getCreditBalance.useQuery(undefined, { enabled: !!session?.user });
  const leadsQuery = trpc.jobs.list.useQuery({ status: "LEAD", limit: 50 }, { enabled: !!session?.user });
  const allJobsQuery = trpc.jobs.list.useQuery({ limit: 50 }, { enabled: !!session?.user });
  const customersQuery = trpc.customers.list.useQuery({ limit: 50 }, { enabled: !!session?.user });

  const leads = leadsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const defaultJobId = allJobsQuery.data?.[0]?.id;
  const tradieName = session?.user?.name || t("tradieMobile.appName");

  return (
    <TradieWorkspaceShell
      title={t("tradieMobile.inboxTitle")}
      user={session?.user}
      onNavigateSettings={() => router.push("/(app)/settings" as Href)}
    >
      <View style={styles.container}>
        <View style={styles.badgeRow}>
          <MobileBadge variant="primary">
            {`${t("tradieSms.creditBalanceLabel")}: ${String(creditQuery.data ?? 0)}`}
          </MobileBadge>
        </View>
        <MobileSegmentedTabs
          activeKey={tab}
          onChange={setTab}
          tabs={[
            { key: "LEADS", label: t("tradieMobile.inboxLeadsTab") },
            { key: "CUSTOMERS", label: t("tradieMobile.inboxCustomersTab") },
          ]}
        />
        {tab === "LEADS" ? (
          leads.length === 0 ? (
            <Text style={styles.empty}>{t("tradieMobile.inboxEmptyLeads")}</Text>
          ) : (
            leads.map((job) => (
              <InboxLeadCard key={job.id} job={job} onOpenJob={(id) => router.push(`/(app)/jobs/${id}` as Href)} />
            ))
          )
        ) : customers.length === 0 ? (
          <Text style={styles.empty}>{t("tradieMobile.inboxEmptyThreads")}</Text>
        ) : (
          customers.map((c) => {
            const phone = c.mobile || c.phone || "";
            return (
              <SettingsCard key={c.id} title={c.name}>
                <Text style={styles.phone}>{phone || t("tradieMobile.smsNoPhoneToast")}</Text>
                <MobileButton
                  title={t("tradieSms.title")}
                  variant="secondary"
                  disabled={!phone}
                  onPress={() => setThreadTarget({ title: c.name, phone, jobId: defaultJobId })}
                />
              </SettingsCard>
            );
          })
        )}
      </View>
      <SmsThreadModal
        visible={Boolean(threadTarget)}
        target={threadTarget}
        tradieName={tradieName}
        onClose={() => setThreadTarget(null)}
      />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  empty: { fontSize: 14, color: DESIGN_TOKENS.colors.textMuted, paddingVertical: 16 },
  phone: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});