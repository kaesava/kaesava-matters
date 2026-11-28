import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileBadge,
  MobileButton,
  MobileSkeletonCard,
  ReadOnlyField,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { QuoteSignAcceptModal } from "../../../components/quotes/QuoteSignAcceptModal";
import { formatMobileCurrency } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [signOpen, setSignOpen] = useState(false);

  const detailQuery = trpc.quotes.getById.useQuery({ id: id ?? "" }, { enabled: Boolean(id) });
  const sendMut = trpc.quotes.send.useMutation();
  const data = detailQuery.data;

  const handleSharePortal = async () => {
    if (!data) return;
    const sent = await sendMut.mutateAsync({ id: data.quote.id });
    void utils.quotes.invalidate();
    toast.success(t("tradieMobile.quoteSentToast"));
    await Share.share({
      message: `${data.quote.quoteNumber} · ${data.quote.title}: https://tradie.kaesava.au/portal/quote/${sent.rawToken}`,
    });
  };

  return (
    <TradieWorkspaceShell
      title={data ? `${data.quote.quoteNumber} · ${data.quote.title}` : t("tradieQuotes.title")}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
        {detailQuery.isLoading || !data ? (
          <MobileSkeletonCard />
        ) : (
          <>
            <SettingsCard title={data.quote.quoteNumber}>
              <ReadOnlyField label={t("common.status")} value={data.quote.status} />
              <ReadOnlyField label={t("common.amount")} value={formatMobileCurrency(data.quote.totalIncTax)} />
              {Number(data.quote.depositAmountDue) > 0 ? (
                <ReadOnlyField label={t("tradieQuotes.depositRequired")} value={formatMobileCurrency(data.quote.depositAmountDue)} />
              ) : null}
              <MobileButton title={t("tradieMobile.sharePortalLinkAction")} loading={sendMut.isPending} onPress={() => void handleSharePortal()} />
              {data.quote.status !== "ACCEPTED" ? (
                <MobileButton title={t("tradieMobile.signOnSpotAction")} variant="secondary" onPress={() => setSignOpen(true)} />
              ) : null}
            </SettingsCard>
            {data.optionGroups.length > 0 ? (
              <SettingsCard title={t("tradieQuotes.goodBetterBest")}>
                {data.optionGroups.map((g) => (
                  <View key={g.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{`${g.name} · ${formatMobileCurrency(g.totalIncTax)}`}</Text>
                    {g.isRecommended ? <MobileBadge variant="primary">{t("tradieQuotes.recommendedOption")}</MobileBadge> : null}
                  </View>
                ))}
              </SettingsCard>
            ) : null}
            <SettingsCard title={t("tradieMobile.quoteLinesTitle")}>
              {data.lines.map((line) => (
                <ReadOnlyField key={line.id} label={`${line.description} (${line.quantity})`} value={formatMobileCurrency(line.lineTotalIncTax)} />
              ))}
            </SettingsCard>
          </>
        )}
      </View>
      {data ? (
        <QuoteSignAcceptModal visible={signOpen} quoteId={data.quote.id} optionGroups={data.optionGroups} onClose={() => setSignOpen(false)} />
      ) : null}
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
});
