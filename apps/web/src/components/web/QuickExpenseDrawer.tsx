import { t } from "@money-matters/i18n";
import {
  SlideOverDrawer,
  PoolPicker,
  ConfirmDialog,
  Button,
  Input,
  DatePickerField,
  GenericSelectField,
  AmountField,
  FormErrorBanner,
  FormLabel,
  HouseholdContributionSection,
} from "@money-matters/ui/web";
import { useQuickActionState } from "./quick/useQuickActionState";
import { QuickPickBadges } from "./quick/QuickPickBadges";
import { CrossBankTransferModal } from "./CrossBankTransferModal";
import { MarkPaidModal } from "../../app/dashboard/plan/components/MarkPaidModal";

import { QuickActionInitialData } from "@money-matters/types";

export interface QuickActionDrawerProps {
  readonly onClose: () => void;
  readonly initialTab?: "DEBIT" | "CREDIT" | "TRANSFER";
  readonly initialData?: QuickActionInitialData;
}

export function QuickActionDrawer({ onClose, initialTab = "DEBIT", initialData }: QuickActionDrawerProps) {
  const {
    type,
    handleTabChange,
    name,
    setName,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    selectedSubCategoryId,
    setSelectedSubCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId,
    receivingAccountId,
    setReceivingAccountId,
    hasPrivateEnvelopes,
    contributionMode,
    setContributionMode,
    contributionValue,
    setContributionValue,
    date,
    setDate,
    todayStr,
    error,
    isIncome,
    isTransfer,
    isFutureDate,
    categories,
    allEnvelopes,
    bankAccounts,
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
    handleSelectPreset,
    handleSubmit,
    executeSubmit,
    isPending,
    confirmState,
    setConfirmState,
    crossBankPrompt,
    setCrossBankPrompt,
    shortfallModalData,
    setShortfallModalData,
    handleConfirmShortfallPaid,
  } = useQuickActionState(onClose, initialTab, initialData);

  const isDrawDown = Boolean(initialData?.isDrawDown) || initialData?.name === "Draw down";

  const activePresets = isTransfer
    ? quickTransferPresets
    : isIncome
    ? quickIncomePresets
    : quickExpensePresets;

  const titleText = isTransfer
    ? t("drawers.quickExpense.transferBetweenEnvelopes")
    : isIncome
    ? t("drawers.quickExpense.oneOffIncome")
    : t("drawers.quickExpense.oneOffExpense");

  const isDirty = name.trim() !== "" || amount.trim() !== "" || categoryId !== "";

  return (
    <>
      <SlideOverDrawer
        title={titleText}
        onClose={onClose}
        isDirty={isDirty}
        widthClass="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* 3-Way Segmented Control */}
              <div className="flex rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("DEBIT")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "DEBIT" ? "bg-white text-[#2563eb] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("common.expense")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("CREDIT")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "CREDIT" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("common.income")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("TRANSFER")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "TRANSFER" ? "bg-white text-indigo-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("common.transfer")}</span>
                </button>
              </div>

              {/* Quick Pick Badges (Recent & Frequent) */}
              <QuickPickBadges
                recentPresets={activePresets.recent}
                frequentPresets={activePresets.frequent}
                onSelect={handleSelectPreset}
              />

              <FormErrorBanner message={error} />

              {isTransfer ? (
                <>
                  <Input
                    label={t("drawers.quickExpense.transferName")}
                    autoFocus={true}
                    required
                    placeholder={t("drawers.quickExpense.transferNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <div className="flex flex-col gap-1">
                    <FormLabel required>{t("drawers.quickExpense.fromEnvelope")}</FormLabel>
                    <PoolPicker
                      pools={categories.map((p) => ({
                        id: p.id,
                        name: p.name,
                        poolType: p.type || p.poolType,
                        currentBalance: p.currentBalance,
                        isPrivate: p.isPrivate ?? undefined,
                      }))}
                      selectedPoolId={sourceCategoryId || null}
                      allowCategorySelection={false}
                      placeholder={t("drawers.quickExpense.selectSourceEnvelopePlaceholder")}
                      showBalance={true}
                      onChange={(sel) => setSourceCategoryId(sel.poolId)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <FormLabel required>{t("drawers.quickExpense.toEnvelopeDestination")}</FormLabel>
                    <PoolPicker
                      pools={categories.map((p) => ({
                        id: p.id,
                        name: p.name,
                        poolType: p.type || p.poolType,
                        currentBalance: p.currentBalance,
                        isPrivate: p.isPrivate ?? undefined,
                      }))}
                      selectedPoolId={destinationCategoryId || null}
                      allowCategorySelection={false}
                      placeholder={t("drawers.quickExpense.selectDestinationEnvelopePlaceholder")}
                      showBalance={true}
                      onChange={(sel) => setDestinationCategoryId(sel.poolId)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label={isIncome ? t("drawers.quickExpense.incomeSourceDescription") : t("drawers.quickExpense.expenseNameMerchant")}
                    autoFocus={!isDrawDown}
                    required
                    placeholder={isIncome ? t("drawers.quickExpense.freelancePlaceholder") : t("drawers.quickExpense.woolworthsPlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  {!isIncome && (
                    <div className="flex flex-col gap-1">
                      <FormLabel required>
                        {t("categories.typeLabel")}
                      </FormLabel>
                      <PoolPicker
                        pools={categories.map((p) => ({
                          id: p.id,
                          name: p.name,
                          poolType: p.type || p.poolType,
                          currentBalance: p.currentBalance,
                          isPrivate: p.isPrivate ?? undefined,
                          categories: p.categories,
                        }))}
                        selectedPoolId={categoryId || null}
                        selectedCategoryId={selectedSubCategoryId || null}
                        allowCategorySelection={true}
                        placeholder={t("common.selectEnvelope")}
                        showBalance={true}
                        onChange={(sel) => {
                          setCategoryId(sel.poolId);
                          setSelectedSubCategoryId(sel.categoryId);
                        }}
                      />
                    </div>
                  )}

                  {isIncome && (
                    <GenericSelectField
                      label={t("drawers.quickExpense.receivingAccount")}
                      required
                      value={receivingAccountId}
                      onChange={setReceivingAccountId}
                      placeholder={t("drawers.quickExpense.selectBankAccountPlaceholder")}
                      options={bankAccounts.map((a: { id: string; name: string }) => ({
                        value: a.id,
                        label: a.name,
                      }))}
                    />
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 items-end">
                <AmountField
                  label={t("common.amount")}
                  required
                  autoFocus={isDrawDown}
                  value={amount}
                  onChange={setAmount}
                />

                <DatePickerField
                  label={t("tables.date")}
                  required
                  min={isTransfer ? todayStr : undefined}
                  value={date}
                  onChange={setDate}
                />
              </div>

              {isIncome && (
                <HouseholdContributionSection
                  hasPrivateEnvelopes={hasPrivateEnvelopes}
                  contributionMode={contributionMode}
                  onContributionModeChange={setContributionMode}
                  contributionValue={contributionValue}
                  onContributionValueChange={setContributionValue}
                />
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                >
                  {t("common.cancel")}
                </Button>
                {isIncome && (
                  <button
                    type="button"
                    disabled={isPending || !name.trim() || !amount.trim() || parseFloat(amount) <= 0 || !receivingAccountId}
                    onClick={() => executeSubmit(false, true)}
                    className="px-4 py-2.5 text-xs font-bold text-[#2563eb] hover:text-blue-800 underline cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {t("common.saveOnly")}
                  </button>
                )}
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={
                    !name.trim() ||
                    !amount.trim() ||
                    parseFloat(amount) <= 0 ||
                    (isTransfer
                      ? !sourceCategoryId || !destinationCategoryId || sourceCategoryId === destinationCategoryId
                      : isIncome
                      ? !receivingAccountId
                      : !categoryId)
                  }
                  variant="primary"
                >
                  {isTransfer
                    ? isFutureDate
                    ? t("common.saveOnly")
                    : t("common.transfer")
                    : isIncome
                    ? t("common.allocateIncome")
                    : isFutureDate
                    ? t("common.saveOnly")
                    : t("common.markSpent")}
                </Button>
              </div>
        </form>


        {confirmState && (
          <ConfirmDialog
            isOpen={confirmState.isOpen}
            onClose={() => setConfirmState(null)}
            onConfirm={confirmState.onConfirm}
            title={confirmState.title}
            description={confirmState.description}
            confirmLabel={t("common.proceed")}
            variant="warning"
          />
        )}
      </SlideOverDrawer>

      {crossBankPrompt && (
        <CrossBankTransferModal
          isOpen={!!crossBankPrompt}
          onClose={() => {
            setCrossBankPrompt(null);
            onClose();
          }}
          {...crossBankPrompt}
        />
      )}

      {shortfallModalData && (
        <MarkPaidModal
          isOpen={Boolean(shortfallModalData)}
          onClose={() => setShortfallModalData(null)}
          billName={shortfallModalData.billName}
          initialAmount={shortfallModalData.amount}
          initialDate={shortfallModalData.date}
          poolId={shortfallModalData.poolId}
          poolName={shortfallModalData.poolName}
          poolType={shortfallModalData.poolType}
          availableCategories={allEnvelopes.map((c) => ({
            id: c.id,
            name: c.name,
            poolType: c.envelopeType,
            currentBalance: c.currentBalance,
            isSurplusTarget: c.isSurplusTarget,
            isPrivate: c.isPrivate,
          }))}
          onConfirmMarkPaid={handleConfirmShortfallPaid}
        />
      )}
    </>
  );
}


export { QuickActionDrawer as QuickExpenseDrawer };
