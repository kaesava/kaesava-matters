# Money Matters — Authoritative Data Dictionary & RLS Registry

> **Version**: 2.1.0 (Unified Flat Envelopes Architecture + Master RLS & Consumer Registry)  
> **Compliance**: Enforced via `pnpm audit:schema` in `pnpm validate`.  
> **Agent Protocol**: This file is the **single source of truth** for all 23 Drizzle tables, column definitions, RLS policies (`ENABLE` / `FORCE ROW LEVEL SECURITY`), session variable requirements (`app.current_tenant_id`, `app.current_user_id`), and production code consumers. Update this file whenever any schema, migration, RLS policy, or table consumer changes.

---

## Master Table, Audit Compliance, RLS Policy & Consumer Registry (23 Tables)

| # | SQL Table Name (`Drizzle Export`) | Schema File | Domain Columns | Audit Columns Status (`id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`) | RLS Enabled / Forced in Migrations | RLS Policy Type & Session Vars | Production Code Consumers |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `ai_usage` (`aiUsage`) | `packages/db/src/schema/ai_usage.ts` (31L) | `periodMonth`, `llmCalls` | Complete (`0059`: `appId`, `archivedBy`) | Enabled + **Forced** (`0045`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/assistant/src/queries/ask.query.ts`, `packages/capabilities/assistant/src/usage/db-usage-store.ts`, `packages/capabilities/tenant/src/delete-account.ts` |
| 2 | `allocation_plans` (`allocationPlans`) | `packages/db/src/schema/allocation_plan.ts` (16L) | `incomeEventId`, `status`, `totalIncomeAmount`, `confirmedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_events -> income_sources -> bank_accounts` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts`, `tenant/src/export-data.ts` |
| 3 | `allocation_plan_lines` (`allocationPlanLines`) | `packages/db/src/schema/allocation_plan_line.ts` (17L) | `planId`, `envelopeId`, `proposedAmount`, `confirmedAmount`, `sweptAmount`, `reasoning` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts` |
| 4 | `allocation_strategies` (`allocationStrategies`) | `packages/db/src/schema/allocation_strategy.ts` (17L) | `name`, `presetKey`, `description`, `isDefault`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`, `0058`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`0058`: `is_private = false OR user_id = app.current_user_id`) | `apps/api/src/routers/payday/payday-strategy.procedures.ts`, `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 5 | `allocation_strategy_steps` (`allocationStrategySteps`) | `packages/db/src/schema/allocation_strategy_step.ts` (36L) | `strategyId`, `orderIndex`, `stepType`, `targetEnvelopeId`, `config` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`) | `tenant_isolation` | `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 6 | `apps` (`apps`) | `packages/db/src/schema/app.ts` (25L) | `name`, `slug`, `featureFlags` | Global catalog table: `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy` (`0059`) | **Disabled** (Global catalog table) | None | `apps/api/src/routers/*`, `packages/capabilities/budgeting/src/commands/restore-item.command.ts`, `tenant/src/handlers/create-tenant.ts`, `packages/db/src/set-app-flag.ts` |
| 7 | `bank_accounts` (`bankAccounts`) | `packages/db/src/schema/bank_account.ts` (23L) | `name`, `bankProvider`, `accountType`, `lastKnownBalance`, `unbudgetedBuffer`, `lastBalanceMatchedAt`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/bank-accounts/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `transactions/*` |
| 8 | `billing_invoices` (`billingInvoices`) | `packages/db/src/schema/billing_invoice.ts` (38L) | `stripeInvoiceId`, `stripeCustomerId`, `stripeSubscriptionId`, `amountPaid`, `currency`, `status`, `paidAt`, `periodStart`, `periodEnd`, `invoicePdfUrl`, `hostedInvoiceUrl` | Complete (`0059`: `appId`, `archivedBy`) | Enabled + **Forced** (`0031`, `0067`) | `billing_invoices_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/billing/src/commands/*`, `queries/list-invoices.ts`, `webhooks/handlers/invoice-events.ts`, `tenant/src/delete-account.ts` |
| 9 | `bug_reports` (`bugReports`) | `0021_add_bug_reports.sql` (table) | `title`, `description`, `category`, `severity`, `status`, `appVersion`, `platform`, `pageUrl`, `deviceInfo` | Complete (`tenantAndTimestamps`) | Enabled (`0021`) + **Forced** (`0058`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/bug-reports/*`, `packages/capabilities/tenant/src/delete-account.ts` |
| 10 | `device_tokens` (`deviceTokens`) | `packages/db/src/schema/device_token.ts` (14L) | `userId`, `platform`, `token` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0031`) | `device_tokens_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/notifications/src/push-tokens.ts`, `retention-workflows.ts`, `tenant/src/delete-account.ts` |
| 11 | `early_access_subscribers` (`earlyAccessSubscribers`) | `packages/db/src/schema/early_access.ts` (23L) | `appId`, `email` | Global waitlist table: `id`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy` (`0059`) | **Disabled** (Public waitlist table) | None | `apps/api/src/routers/tenant/tenant-core.procedures.ts` |
| 12 | `envelopes` (`envelopes`) | `packages/db/src/schema/envelope.ts` (52L) | `name`, `envelopeType`, `bankAccountId`, `safetyBufferFloor`, `monthlyAmount`, `enteredAmount`, `budgetFrequency`, `startDate`, `endDate`, `rrule`, `targetAmount`, `isSurplusTarget`, `isPrivate`, `userId`, `orderIndex`, `goalType`, `fundingMode`, `isPriority`, `lastNotifiedAt`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 13 | `expense_events` (`expenseEvents`) | `packages/db/src/schema/expense_event.ts` (37L) | `envelopeId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `isScheduled`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*` |
| 14 | `file_notes` (`fileNotes`) | `packages/db/src/schema/file_note.ts` (32L) | `entityType`, `entityId`, `comment`, `fileKey`, `fileName`, `fileMimeType`, `fileSize`, `isPrivate`, `isAutoGenerated`, `userId` | Complete (`tenantAndTimestamps`) | Enabled (`0051`) + **Forced** (`0058`) | `tenant_and_stealth_isolation` (`tenant_id` + `is_private = false OR user_id = app.current_user_id`) | `packages/capabilities/file-notes/src/handlers/index.ts`, `packages/capabilities/tenant/src/handlers/partner-invites.ts`, `packages/capabilities/tradie-operations/src/*` |
| 15 | `income_sources` (`incomeSources`) | `packages/db/src/schema/income.ts` (28L) | `name`, `amount`, `incomeType`, `receivingAccountId`, `rrule`, `startDate`, `endDate`, `contributionMode`, `contributionValue`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `bank_accounts` on `receiving_account_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `tenant/*` |
| 16 | `income_events` (`incomeEvents`) | `packages/db/src/schema/income_event.ts` (25L) | `incomeSourceId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `contributionMode`, `contributionValue`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_sources -> bank_accounts`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*` |
| 17 | `processed_webhooks` (`processedWebhooks`) | `packages/db/src/schema/processed_webhooks.ts` (9L) | `eventId` (PK), `processedAt` | Global idempotency table | **Disabled** (Global Stripe webhook table) | None | `packages/capabilities/billing/src/webhooks/stripe-webhook-handler.ts`, `packages/capabilities/notifications/src/retention-workflows.ts` |
| 18 | `tenants` (`tenants`) | `packages/db/src/schema/tenant.ts` (46L) | `appId`, `name`, `country`, `currency`, `timezone`, `state`, `postcode`, `premiumEnabled`, `subscriptionStatus`, `trialStartedAt`, `trialEndsAt`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `subscribedAt`, `subscriptionEndsAt`, `gracePeriodEndsAt`, `cancelAtPeriodEnd`, `planType`, `nextBillingAt`, `trialConvertedAt`, `setupCompletedAt`, `setupStatus` | Has `id`, `appId`, `...timestamps` (`id` is tenantId) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/*`, `apps/api/src/trpc/edge-context.ts`, `apps/api/src/inngest/*`, `packages/capabilities/assistant/*`, `billing/*`, `budgeting/*`, `notifications/*`, `tenant/*` |
| 19 | `tenant_users` (`tenantUsers`) | `packages/db/src/schema/tenant_user.ts` (37L) | `tenantId`, `userId`, `inviteEmail`, `role`, `appRole`, `inviteToken`, `inviteStatus`, `expiresAt` | Complete (`id`, `tenantId`, timestamps) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/notifications/*`, `tenant/*` |
| 20 | `tenant_user_preferences` (`tenantUserPreferences`) | `packages/db/src/schema/tenant_user_preference.ts` (60L) | `userId`, `tenantId`, `appId`, `appPreferences` | Complete (`createdBy`/`updatedBy` nullable) | Enabled + **Forced** (`0040`) | `tenant_user_preferences_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `packages/capabilities/notifications/*`, `tenant/src/delete-account.ts` |
| 21 | `transaction_ledger` (`transactionLedger`) | `packages/db/src/schema/transaction_ledger.ts` (43L) | `envelopeId`, `bankAccountId`, `planLineId`, `flowType`, `transactionType`, `amount`, `idempotencyKey`, `note`, `source`, `transferGroupId`, `recordedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 22 | `transfer_events` (`transferEvents`) | `packages/db/src/schema/transfer_event.ts` (19L) | `sourceEnvelopeId`, `destinationEnvelopeId`, `name`, `expectedDate`, `expectedAmount`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (checks both `source_envelope_id` and `destination_envelope_id` against `envelopes`) | `apps/api/src/routers/transfers.router.ts`, `packages/capabilities/budgeting/*`, `tenant/src/delete-account.ts` |
| 23 | `users` (`users`) & `user_preferences` (`userPreferences`) | `packages/db/src/schema/user.ts` (27L) & `user_preference.ts` (28L) | `users`: `email`, `displayName`, `avatarUrl`, `termsAcceptedAt`, `termsVersion`, `privacyVersion`; `user_preferences`: `userId`, `language`, `timezone`, `showIcons`, `notificationEmail`, `phoneCountryCode`, `phoneNumber`, `telemetryConsent`, `hideAmountsInNotifications` | Global user tables (`0059`: `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`) | `users`: Disabled; `user_preferences`: Enabled (`0039`) + **Forced** (`0058`) | `user_preferences_user_isolation`: `user_id = current_setting('app.current_user_id')` | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/billing/*`, `file-notes/*`, `notifications/*`, `tenant/*` |
| 24 | `user_app_trials` (`userAppTrials`) | `packages/db/src/schema/user_app_trial.ts` (29L) | `userId`, `appId`, `firstTrialStartedAt` | Per-app trial ledger (`0066`: `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`) | Enabled + **Forced** (`0066`) | `user_app_trials_isolation`: `user_id = current_setting('app.current_user_id')` | `packages/capabilities/tenant/src/handlers/create-tenant.ts` |
| 25 | `tm_business_profiles` (`tmBusinessProfiles`) | `packages/db/src/schema/tm_business_profile.ts` (28L) | `tradeType`, `abn`, `gstRegistered`, `defaultTaxRatePercent`, `quotePrefix`, `nextQuoteNumber`, `invoicePrefix`, `nextInvoiceNumber`, `defaultPaymentTermsDays`, `defaultHourlyChargeRate`, `bankAccountName`, `bankBsb`, `bankAccountNumber`, `stripeAccountId`, `stripeChargesEnabled`, `defaultMaxCardAmount` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0069`) | `tm_business_profiles_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/business/*`, `invoicing/*`, `apps/tradie-matters/api/src/routers/business.ts` |
| 26 | `tm_team_member_profiles` (`tmTeamMemberProfiles`) | `packages/db/src/schema/tm_team_member_profile.ts` (21L) | `userId`, `tradeLicenseNumber`, `licenseExpiryDate`, `internalHourlyCostRate`, `defaultChargeOutRate`, `colorHex`, `phone`, `isFieldActive` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0069`) | `tm_team_member_profiles_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/business/*`, `apps/tradie-matters/api/src/routers/business.ts` |
| 27 | `tm_customers` (`tmCustomers`) | `packages/db/src/schema/tm_customer.ts` (21L) | `name`, `companyName`, `customerType`, `email`, `phone`, `mobile`, `abn`, `billingAddress`, `paymentTermsDays`, `creditBalance`, `notes` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0070`) | `tm_customers_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/crm/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 28 | `tm_sites` (`tmSites`) | `packages/db/src/schema/tm_site.ts` (23L) | `name`, `addressLine1`, `addressLine2`, `suburb`, `state`, `postcode`, `country`, `latitude`, `longitude`, `accessNotes`, `keySafeCode`, `siteContactName`, `siteContactPhone` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0070`) | `tm_sites_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/crm/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 29 | `tm_customer_sites` (`tmCustomerSites`) | `packages/db/src/schema/tm_customer_site.ts` (20L) | `customerId`, `siteId`, `relationshipRole`, `isPrimary` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0070`) | `tm_customer_sites_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/crm/*` |
| 30 | `tm_pricebook_items` (`tmPricebookItems`) | `packages/db/src/schema/tm_pricebook_item.ts` (23L) | `sku`, `name`, `description`, `itemType`, `category`, `unitOfMeasure`, `searchAliases`, `unitCostExTax`, `markupPct`, `sellPriceExTax`, `taxCode`, `isFavourite`, `supplierName` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0070`) | `tm_pricebook_items_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/pricebook/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 31 | `tm_jobs` (`tmJobs`) | `packages/db/src/schema/tm_job.ts` (31L) | `jobNumber`, `title`, `description`, `status`, `priority`, `customerId`, `siteId`, `leadTradieUserId`, `scheduledStart`, `scheduledEnd`, `completedAt`, `estimatedHours`, `quotedAmountExTax`, `hasUnbilledExtras`, `purchaseOrderNumber`, `internalNotes` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_jobs_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/jobs/*`, `dispatch/*`, `field/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 32 | `tm_job_visits` (`tmJobVisits`) | `packages/db/src/schema/tm_job_visit.ts` (26L) | `jobId`, `title`, `status`, `scheduledStart`, `scheduledEnd`, `actualCheckInAt`, `actualCheckOutAt`, `checkInLat`, `checkInLng`, `checkOutLat`, `checkOutLng`, `visitNotes`, `clientMutationId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_job_visits_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/dispatch/*`, `field/*` |
| 33 | `tm_job_visit_assignees` (`tmJobVisitAssignees`) | `packages/db/src/schema/tm_job_visit_assignee.ts` (19L) | `visitId`, `userId`, `isLead` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_job_visit_assignees_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/dispatch/*` |
| 34 | `tm_time_entries` (`tmTimeEntries`) | `packages/db/src/schema/tm_time_entry.ts` (33L) | `jobId`, `visitId`, `userId`, `startedAt`, `endedAt`, `durationMinutes`, `isBillable`, `hourlyCostSnapshot`, `hourlyChargeSnapshot`, `invoicedInInvoiceId`, `notes`, `clientMutationId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_time_entries_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/field/timers.ts` |
| 35 | `tm_variations` (`tmVariations`) | `packages/db/src/schema/tm_variation.ts` (23L) | `jobId`, `variationNumber`, `title`, `description`, `status`, `totalExTax`, `totalTax`, `totalIncTax`, `approvedAt`, `approvedByName` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_variations_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/field/variations.ts` |
| 36 | `tm_variation_lines` (`tmVariationLines`) | `packages/db/src/schema/tm_variation_line.ts` (27L) | `variationId`, `pricebookItemId`, `description`, `quantity`, `unitCostExTax`, `unitSellPriceExTax`, `taxCode`, `lineTotalExTax`, `sortOrder` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_variation_lines_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/field/variations.ts` |
| 37 | `tm_material_usages` (`tmMaterialUsages`) | `packages/db/src/schema/tm_material_usage.ts` (30L) | `jobId`, `visitId`, `pricebookItemId`, `description`, `quantity`, `unitCostSnapshot`, `unitSellPriceExTax`, `taxCode`, `isBillable`, `invoicedInInvoiceId`, `clientMutationId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_material_usages_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/field/materials-photos.ts` |
| 38 | `tm_job_attachments` (`tmJobAttachments`) | `packages/db/src/schema/tm_job_attachment.ts` (23L) | `jobId`, `visitId`, `fileNoteId`, `photoCategory`, `visibility`, `caption` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0071`) | `tm_job_attachments_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/field/materials-photos.ts` |
| 39 | `tm_quotes` (`tmQuotes`) | `packages/db/src/schema/tm_quote.ts` (43L) | `quoteNumber`, `title`, `description`, `status`, `customerId`, `siteId`, `jobId`, `version`, `validUntil`, `gstMode`, `subtotalExTax`, `totalTax`, `totalIncTax`, `depositType`, `depositValue`, `depositAmountDue`, `portalTokenHash`, `sentAt`, `viewedAt`, `acceptedAt`, `declinedAt`, `declineReason`, `signerName`, `signatureSvg`, `selectedOptionGroupId`, `pdfFileNoteId`, `followUpSentAt`, `notes` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0072`) | `tm_quotes_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/quotes/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 40 | `tm_quote_option_groups` (`tmQuoteOptionGroups`) | `packages/db/src/schema/tm_quote_option_group.ts` (22L) | `quoteId`, `name`, `description`, `isRecommended`, `isSelected`, `sortOrder`, `subtotalExTax`, `totalTax`, `totalIncTax` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0072`) | `tm_quote_option_groups_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/quotes/*` |
| 41 | `tm_quote_lines` (`tmQuoteLines`) | `packages/db/src/schema/tm_quote_line.ts` (26L) | `quoteId`, `optionGroupId`, `pricebookItemId`, `description`, `quantity`, `unitCostExTax`, `unitSellPrice`, `taxCode`, `lineTotalExTax`, `lineTax`, `lineTotalIncTax`, `sortOrder` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0072`) | `tm_quote_lines_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/quotes/*` |
| 42 | `tm_comm_logs` (`tmCommLogs`) | `packages/db/src/schema/tm_comm_log.ts` (19L) | `entityType`, `entityId`, `channel`, `direction`, `recipient`, `subject`, `bodyPreview`, `status`, `sentAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0072`) | `tm_comm_logs_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/quotes/*`, `invoicing/*` |
| 43 | `tm_invoices` (`tmInvoices`) | `packages/db/src/schema/tm_invoice.ts` (43L) | `invoiceNumber`, `invoiceType`, `status`, `customerId`, `siteId`, `jobId`, `quoteId`, `issueDate`, `dueDate`, `gstRegisteredSnapshot`, `documentTitle`, `subtotalExTax`, `totalTax`, `totalIncTax`, `amountPaid`, `creditApplied`, `balanceDue`, `lockedAt`, `legalHoldUntil`, `allowCardPayment`, `maxCardAmountOverride`, `portalTokenHash`, `chasingEnabled`, `chasingScheduleDaysJson`, `lastChasedStage`, `disputedReason`, `pdfFileNoteId`, `notes` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0073`) | `tm_invoices_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/invoicing/*`, `pulse/*`, `apps/tradie-matters/api/src/routers/operations.ts` |
| 44 | `tm_invoice_lines` (`tmInvoiceLines`) | `packages/db/src/schema/tm_invoice_line.ts` (26L) | `invoiceId`, `sourceType`, `sourceId`, `pricebookItemId`, `description`, `quantity`, `unitCostExTax`, `unitSellPrice`, `taxCode`, `lineTotalExTax`, `lineTax`, `lineTotalIncTax`, `sortOrder` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0073`) | `tm_invoice_lines_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/invoicing/*` |
| 45 | `tm_invoice_payments` (`tmInvoicePayments`) | `packages/db/src/schema/tm_invoice_payment.ts` (23L) | `invoiceId`, `customerId`, `amount`, `paymentMethod`, `paymentDate`, `reference`, `stripePaymentIntentId`, `stripeChargeId`, `refundedAmount`, `notes` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0073`) | `tm_invoice_payments_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/invoicing/*`, `pulse/*` |
| 46 | `tm_credit_notes` (`tmCreditNotes`) | `packages/db/src/schema/tm_credit_note.ts` (23L) | `creditNoteNumber`, `invoiceId`, `customerId`, `reason`, `amountExTax`, `taxAmount`, `totalIncTax`, `creditDestination`, `issuedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0073`) | `tm_credit_notes_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/invoicing/*`, `pulse/*` |
| 47 | `tm_invoice_refunds` (`tmInvoiceRefunds`) | `packages/db/src/schema/tm_invoice_refund.ts` (20L) | `invoiceId`, `paymentId`, `amount`, `refundMethod`, `reason`, `stripeRefundId`, `refundedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0073`) | `tm_invoice_refunds_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-operations/src/invoicing/*`, `pulse/*` |
| 48 | `tm_accounting_connections` (`tmAccountingConnections`) | `packages/db/src/schema/tm_accounting_connection.ts` (18L) | `provider`, `externalTenantId`, `externalTenantName`, `accessTokenEnc`, `refreshTokenEnc`, `tokenExpiresAt`, `lastSyncedAt`, `syncCursor` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0074`) | `tm_accounting_connections_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/accounting/*`, `apps/tradie-matters/api/src/*` |
| 49 | `tm_accounting_entity_links` (`tmAccountingEntityLinks`) | `packages/db/src/schema/tm_accounting_entity_link.ts` (17L) | `provider`, `entityType`, `localId`, `externalId`, `syncStatus`, `lastSyncHash`, `lastError` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0074`) | `tm_accounting_entity_links_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/accounting/*` |
| 50 | `tm_supplier_bills` (`tmSupplierBills`) | `packages/db/src/schema/tm_supplier_bill.ts` (24L) | `jobId`, `supplierName`, `supplierAbn`, `billNumber`, `issueDate`, `dueDate`, `subtotalExTax`, `taxAmount`, `totalIncTax`, `receiptFileNoteId`, `source`, `status`, `appliedMarkupPct` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0074`) | `tm_supplier_bills_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/ocr/*`, `accounting/*`, `apps/tradie-matters/api/src/*` |
| 51 | `tm_purchase_orders` (`tmPurchaseOrders`) | `packages/db/src/schema/tm_purchase_order.ts` (25L) | `poNumber`, `jobId`, `supplierName`, `supplierEmail`, `status`, `linesJson`, `notes`, `sentAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0074`) | `tm_purchase_orders_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/ocr/*` |
| 52 | `chat_rooms` (`chatRooms`) | `packages/db/src/schema/chat_room.ts` (14L) | `entityType`, `entityId`, `title`, `isPinned` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `chat_rooms_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/chat/src/*`, `apps/tradie-matters/api/src/routers/chat.ts` |
| 53 | `chat_members` (`chatMembers`) | `packages/db/src/schema/chat_member.ts` (17L) | `roomId`, `userId`, `role` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `chat_members_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/chat/src/*` |
| 54 | `chat_messages` (`chatMessages`) | `packages/db/src/schema/chat_message.ts` (19L) | `roomId`, `senderUserId`, `body`, `replyToMessageId`, `mentionedUserIdsJson` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `chat_messages_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/chat/src/*` |
| 55 | `chat_reads` (`chatReads`) | `packages/db/src/schema/chat_read.ts` (16L) | `roomId`, `userId`, `lastReadAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `chat_reads_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/chat/src/*` |
| 56 | `tm_phone_numbers` (`tmPhoneNumbers`) | `packages/db/src/schema/tm_phone_number.ts` (15L) | `e164Number`, `twilioPhoneSid`, `missedCallAutoTextEnabled`, `missedCallTemplate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `tm_phone_numbers_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/telephony/*`, `apps/tradie-matters/api/src/*` |
| 57 | `tm_sms_credit_entries` (`tmSmsCreditEntries`) | `packages/db/src/schema/tm_sms_credit_entry.ts` (16L) | `creditsDelta`, `reason`, `stripeCheckoutSessionId`, `commLogId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `tm_sms_credit_entries_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/telephony/*`, `apps/tradie-matters/api/src/*` |
| 58 | `tm_review_requests` (`tmReviewRequests`) | `packages/db/src/schema/tm_review_request.ts` (21L) | `jobId`, `invoiceId`, `customerId`, `googleReviewUrl`, `ratingScore`, `redirectedToGoogleAt`, `sentAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0075`) | `tm_review_requests_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/tradie-integrations/src/telephony/*`, `apps/tradie-matters/api/src/inngest/*` |

---

## Per-Table Column Definitions

## Table: `allocation_plans` (`allocation_plan.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `incomeEventId` | uuid | No | Domain column |
| `status` | allocationPlanStatusEnum | No | Domain column |
| `totalIncomeAmount` | numeric | No | Domain column |
| `confirmedAt` | timestamp | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_plan_lines` (`allocation_plan_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `planId` | uuid | No | Domain column |
| `envelopeId` | uuid | No | Domain column |
| `proposedAmount` | numeric | No | Domain column |
| `confirmedAmount` | numeric | Yes | Domain column |
| `sweptAmount` | numeric | Yes | Exact residual Step 7 surplus sweep amount recorded at payday confirmation (`0063`) |
| `reasoning` | text | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_strategies` (`allocation_strategy.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Strategy profile name |
| `presetKey` | varchar | No | Canonical preset key or CUSTOM |
| `description` | text | Yes | Plain-English strategy explanation |
| `isDefault` | boolean | No | Flag indicating active strategy for tenant |
| `isPrivate` | boolean | No | True if strategy applies to private personal envelopes |
| `userId` | uuid | Yes | Owner User ID for private personal strategy |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_strategy_steps` (`allocation_strategy_step.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `strategyId` | uuid | Yes | Foreign key to allocation_strategies |
| `orderIndex` | integer | No | Order index within the allocation recipe |
| `stepType` | allocationStepTypeEnum | No | Allocation rule block type |
| `targetEnvelopeId` | uuid | Yes | Target envelope for fixed/sweep steps |
| `config` | jsonb | Yes | Optional step configuration parameters |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `apps` (`app.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `slug` | varchar | No | Domain column |
| `featureFlags` | jsonb | No | App-level feature flags and entitlements (`fileNotes`, `askPenny`, `privateMode`, `simulation`, `customAllocationRules`, quotas) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `bank_accounts` (`bank_account.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `bankProvider` | varchar | No | Optional free-text bank institution (defaults to `"Other"`) |
| `accountType` | accountTypeEnum | No | Domain column |
| `lastKnownBalance` | numeric | No | Domain column |
| `unbudgetedBuffer` | numeric | No | Domain column |
| `lastBalanceMatchedAt` | timestamp | Yes | Balance reconciliation timestamp |
| `isPrivate` | boolean | No | Domain column |
| `userId` | uuid | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `billing_invoices` (`billing_invoice.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | Yes | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `stripeInvoiceId` | varchar | No | Domain column |
| `stripeCustomerId` | varchar | No | Domain column |
| `stripeSubscriptionId` | varchar | Yes | Domain column |
| `amountPaid` | numeric | No | Domain column |
| `currency` | varchar | No | Domain column |
| `status` | varchar | No | Domain column |
| `paidAt` | timestamp | Yes | Domain column |
| `periodStart` | timestamp | Yes | Domain column |
| `periodEnd` | timestamp | Yes | Domain column |
| `invoicePdfUrl` | varchar | Yes | Domain column |
| `hostedInvoiceUrl` | varchar | Yes | Domain column |
| `legalHoldUntil` | timestamp | Yes | Statutory 5-year tax/invoice legal-hold expiry (when `tenantId` is nulled on deletion) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `device_tokens` (`device_token.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `platform` | varchar | No | Domain column |
| `token` | varchar | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `early_access_subscribers` (`early_access.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `appId` | uuid | No | Application ID |
| `email` | varchar | No | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `envelopes` (`envelope.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `envelopeType` | envelopeTypeEnum | No | Domain column |
| `bankAccountId` | uuid | Yes | Domain column |
| `safetyBufferFloor` | numeric | Yes | Domain column |
| `fundingMode` | fundingModeEnum | Yes | Funding mode: TARGET_BALANCE or RECURRING |
| `monthlyAmount` | numeric | Yes | Domain column |
| `enteredAmount` | numeric | Yes | Domain column |
| `budgetFrequency` | varchar | Yes | Domain column |
| `startDate` | varchar | Yes | Domain column |
| `endDate` | varchar | Yes | Domain column |
| `rrule` | varchar | Yes | Domain column |
| `targetAmount` | numeric | Yes | Target milestone or buffer amount |
| `isPriority` | boolean | No | Priority flag for allocation waterfalls (Priority Bills & Priority Goals) |
| `isSurplusTarget` | boolean | No | Single shared Shortfall/Surplus target per `(tenant_id, app_id)` enforced by `CHECK (NOT (is_surplus_target AND is_private))` and partial unique index `envelopes_single_surplus_target_idx` (`0063`) |
| `isPrivate` | boolean | No | Domain column |
| `generateEvents` | boolean | No | Controls auto-generation of upcoming scheduled expense events (`true` only for `BILL` + `RECURRING`; normalized to `false` otherwise) |
| `userId` | uuid | Yes | Domain column |
| `orderIndex` | integer | No | Domain column |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `expense_events` (`expense_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `envelopeId` | uuid | No | Domain column |
| `name` | varchar | No | Domain column |
| `expectedDate` | date | No | Domain column |
| `actualDate` | date | Yes | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `actualAmount` | numeric | Yes | Domain column |
| `isScheduled` | boolean | No | Domain column |
| `note` | varchar | Yes | Domain column |
| `status` | expenseEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `income_sources` (`income.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `amount` | numeric | No | Domain column |
| `incomeType` | incomeTypeEnum | No | Domain column |
| `receivingAccountId` | uuid | Yes | Domain column |
| `rrule` | varchar | Yes | Domain column |
| `startDate` | date | Yes | Domain column |
| `endDate` | date | Yes | Domain column |
| `contributionMode` | incomeContributionModeEnum | No | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | Yes | Contribution percentage or fixed dollar amount |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `income_events` (`income_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `incomeSourceId` | uuid | Yes | Domain column |
| `name` | varchar | Yes | Domain column |
| `expectedDate` | date | No | Domain column |
| `actualDate` | date | Yes | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `actualAmount` | numeric | Yes | Domain column |
| `contributionMode` | incomeContributionModeEnum | No | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | Yes | Contribution percentage or fixed dollar amount |
| `note` | varchar | Yes | Domain column |
| `status` | incomeEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `processed_webhooks` (`processed_webhooks.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `eventId` | varchar | No | Domain column |
| `processedAt` | timestamp | No | Domain column |

## Table: `tenants` (`tenant.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `appId` | uuid | No | Application ID |
| `name` | varchar | No | Domain column |
| `country` | varchar | No | Domain column |
| `currency` | varchar | No | Domain column |
| `timezone` | varchar | No | Domain column |
| `state` | varchar | Yes | Domain column |
| `postcode` | varchar | Yes | Domain column |
| `premiumEnabled` | boolean | No | Domain column |
| `subscriptionStatus` | varchar | Yes | Domain column |
| `trialStartedAt` | timestamp | Yes | Domain column |
| `trialEndsAt` | timestamp | Yes | Domain column |
| `stripeCustomerId` | varchar | Yes | Domain column |
| `stripeSubscriptionId` | varchar | Yes | Domain column |
| `stripePriceId` | varchar | Yes | Domain column |
| `subscribedAt` | timestamp | Yes | Domain column |
| `subscriptionEndsAt` | timestamp | Yes | Domain column |
| `gracePeriodEndsAt` | timestamp | Yes | Domain column (7-day read-only grace period on payment failure) |
| `cancelAtPeriodEnd` | boolean | No | Domain column |
| `planType` | varchar | Yes | Domain column |
| `nextBillingAt` | timestamp | Yes | Domain column |
| `trialConvertedAt` | timestamp | Yes | Domain column |
| `setupCompletedAt` | timestamp | Yes | Domain column |
| `setupStatus` | varchar | No | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tenant_users` (`tenant_user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `userId` | uuid | Yes | Domain column |
| `inviteEmail` | varchar | Yes | Domain column |
| `role` | memberRoleEnum | No | Domain column |
| `appRole` | varchar(50) | Yes | Optional Ring 3 app-specific role (e.g., `COORDINATOR`, `TRADIE`, `APPRENTICE`) for 2-layer RBAC (`0065`) |
| `inviteToken` | uuid | Yes | Domain column |
| `inviteStatus` | inviteStatusEnum | No | Domain column |
| `expiresAt` | timestamp | Yes | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tenant_user_preferences` (`tenant_user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `appPreferences` | jsonb | No | App-keyed JSONB preferences (including per-platform `tour_web` and `tour_mobile` status) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `transaction_ledger` (`transaction_ledger.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `envelopeId` | uuid | No | Domain column |
| `bankAccountId` | uuid | Yes | Domain column |
| `planLineId` | uuid | Yes | Domain column |
| `flowType` | transactionFlowEnum | No | Domain column |
| `transactionType` | transactionTypeEnum | No | Domain column |
| `amount` | numeric | No | Domain column |
| `idempotencyKey` | text | No | Domain column |
| `note` | text | Yes | Domain column |
| `source` | transactionSourceEnum | No | Domain column |
| `transferGroupId` | uuid | Yes | Domain column |
| `recordedAt` | timestamp | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `transfer_events` (`transfer_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `sourceEnvelopeId` | uuid | No | Domain column |
| `destinationEnvelopeId` | uuid | No | Domain column |
| `name` | varchar | No | Domain column |
| `expectedDate` | date | No | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `status` | transferEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `users` (`user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `email` | text | No | Domain column |
| `displayName` | text | Yes | Domain column |
| `avatarUrl` | text | Yes | Domain column |
| `termsAcceptedAt` | timestamp | Yes | Timestamp when user accepted Terms & Privacy Policy |
| `termsVersion` | text | Yes | Accepted Terms of Service snapshot version (e.g. `2026-11`) |
| `privacyVersion` | text | Yes | Accepted Privacy Policy snapshot version (e.g. `2026-11`) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `user_app_trials` (`user_app_trial.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | FK to `users.id` |
| `appId` | uuid | No | FK to `apps.id` |
| `firstTrialStartedAt` | timestamp | No | First trial start timestamp for `(userId, appId)` |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `user_preferences` (`user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `language` | varchar | No | Domain column |
| `timezone` | varchar | Yes | Domain column |
| `showIcons` | boolean | No | Domain column |
| `notificationEmail` | varchar | Yes | Domain column |
| `phoneCountryCode` | varchar | Yes | Domain column |
| `phoneNumber` | varchar | Yes | Domain column |
| `telemetryConsent` | varchar | Yes | Per-user PostHog analytics consent (`granted` \| `denied` \| `null`) |
| `hideAmountsInNotifications` | boolean | No | Mask dollar figures in notification emails & mobile push alerts (`false` default) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `ai_usage` (`ai_usage.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | Yes | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `periodMonth` | date | No | First day of billing month (YYYY-MM-01) |
| `llmCalls` | integer | No | Total count of LLM classification calls made in period |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `file_notes` (`file_note.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `entityType` | varchar | No | Target entity polymorphic discriminator ('ENVELOPE', 'BANK_ACCOUNT') |
| `entityId` | uuid | No | Target entity unique identifier |
| `comment` | text | Yes | Plaintext or rich text note contents |
| `fileKey` | varchar | Yes | Cloudflare R2 object storage key path |
| `fileName` | varchar | Yes | Original uploaded file name |
| `fileMimeType` | varchar | Yes | MIME type of uploaded file |
| `fileSize` | varchar | Yes | File size in bytes as string |
| `isPrivate` | boolean | No | Stealth privacy isolation flag |
| `isAutoGenerated` | boolean | No | System-generated PDF/document flag (default `false`) |
| `userId` | uuid | Yes | Owner user ID for private notes (stealth RLS isolation) |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application Foreign Key |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | User ID who soft-deleted the record |

## Migration `0060_drop_dead_columns`

Drops unused columns: `envelopes.{emoji,colorKey}`, `user_preferences.theme`, `tenant_users.{appId,invitedAt}`, `transfer_events.actualAmount`, `early_access_subscribers.lastSubscribedAt`, `processed_webhooks.eventType`.


## Table: `tm_business_profiles` (`tm_business_profile.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tradeType` | varchar | No | Primary trade specialty |
| `abn` | varchar | Yes | Australian Business Number |
| `gstRegistered` | boolean | No | Whether business is GST registered |
| `defaultTaxRatePercent` | numeric | No | Default tax rate percentage |
| `quotePrefix` | varchar | No | Quote numbering prefix |
| `nextQuoteNumber` | integer | No | Next sequential quote number |
| `invoicePrefix` | varchar | No | Invoice numbering prefix |
| `nextInvoiceNumber` | integer | No | Next sequential invoice number |
| `defaultPaymentTermsDays` | integer | No | Default invoice payment terms in days |
| `defaultHourlyChargeRate` | numeric | Yes | Default hourly charge-out rate |
| `bankAccountName` | varchar | Yes | Business bank account name |
| `bankBsb` | varchar | Yes | Business bank BSB code |
| `bankAccountNumber` | varchar | Yes | Business bank account number |
| `stripeAccountId` | varchar | Yes | Connected Stripe Standard account ID |
| `stripeChargesEnabled` | boolean | No | Whether Stripe Connect charges are enabled |
| `defaultMaxCardAmount` | numeric | Yes | Optional default maximum card payment amount |
| `defaultGstMode` | varchar | No | Default GST mode (`EXCLUSIVE`, `INCLUSIVE`, `GST_FREE`) |
| `defaultCallOutFee` | numeric | Yes | Default call-out fee |
| `defaultMarkupPct` | numeric | No | Default material markup percentage |
| `defaultSuperRatePercent` | numeric | No | Default Superannuation Guarantee rate (%) |
| `targetMarginPct` | numeric | No | Default target job profit margin (%) |
| `payIdType` | varchar | Yes | PayID type (`ABN`, `EMAIL`, `PHONE`) |
| `payIdValue` | varchar | Yes | PayID identifier value |
| `logoFileNoteId` | uuid | Yes | Business logo file note FK (`file_notes.id`) |
| `payToEnabled` | boolean | No | Whether Stripe Australia PayTo is active |
| `quoteFollowUpDaysJson` | jsonb | No | Quote follow-up day offsets |
| `googleReviewUrl` | text | Yes | Google Business Review URL |
| `supplierInboxSlug` | varchar | Yes | Unique slug for supplier email-in PDFs |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_team_member_profiles` (`tm_team_member_profile.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Member User ID (`users.id`) |
| `tradeLicenseNumber` | varchar | Yes | Trade license number |
| `licenseExpiryDate` | date | Yes | Trade license expiry date |
| `internalHourlyCostRate` | numeric | Yes | Internal hourly cost rate |
| `defaultChargeOutRate` | numeric | Yes | Default charge-out rate |
| `colorHex` | varchar | Yes | Dispatch calendar color hex |
| `phone` | varchar | Yes | Contact phone number |
| `isFieldActive` | boolean | No | Whether member is active in field |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_customers` (`tm_customer.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Customer full name |
| `companyName` | varchar | Yes | Company or strata name |
| `customerType` | varchar | No | Customer type |
| `email` | varchar | Yes | Email address |
| `phone` | varchar | Yes | Landline phone |
| `mobile` | varchar | Yes | Mobile phone |
| `abn` | varchar | Yes | Customer ABN |
| `billingAddress` | text | Yes | Billing address |
| `paymentTermsDays` | integer | Yes | Custom payment terms in days |
| `creditBalance` | numeric | No | Available customer credit balance |
| `notes` | text | Yes | Internal notes |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_sites` (`tm_site.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Site name |
| `addressLine1` | varchar | No | Street address line 1 |
| `addressLine2` | varchar | Yes | Street address line 2 |
| `suburb` | varchar | Yes | Suburb |
| `state` | varchar | Yes | State |
| `postcode` | varchar | Yes | Postcode |
| `country` | varchar | No | Country code |
| `latitude` | numeric | Yes | Latitude |
| `longitude` | numeric | Yes | Longitude |
| `accessNotes` | text | Yes | Site access notes |
| `keySafeCode` | varchar | Yes | Key safe code |
| `siteContactName` | varchar | Yes | On-site contact name |
| `siteContactPhone` | varchar | Yes | On-site contact phone |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_customer_sites` (`tm_customer_site.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `customerId` | uuid | No | Customer Foreign Key |
| `siteId` | uuid | No | Site Foreign Key |
| `relationshipRole` | varchar | No | Relationship role |
| `isPrimary` | boolean | No | Primary site flag |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_pricebook_items` (`tm_pricebook_item.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `sku` | varchar | Yes | Item SKU |
| `name` | varchar | No | Item name |
| `description` | text | Yes | Item description |
| `itemType` | varchar | No | Item type |
| `category` | varchar | Yes | Category |
| `unitOfMeasure` | varchar | No | Unit of measure |
| `searchAliases` | text | Yes | Search aliases |
| `unitCostExTax` | numeric | No | Unit cost ex-tax |
| `markupPct` | numeric | No | Markup percentage |
| `sellPriceExTax` | numeric | No | Sell price ex-tax |
| `taxCode` | varchar | No | Tax code |
| `isFavourite` | boolean | No | Favourite flag |
| `supplierName` | varchar | Yes | Supplier name |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_jobs` (`tm_job.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobNumber` | varchar | No | Sequential job number |
| `title` | varchar | No | Job title |
| `description` | text | Yes | Job description |
| `status` | varchar | No | Job status |
| `priority` | varchar | No | Priority |
| `customerId` | uuid | No | Customer Foreign Key |
| `siteId` | uuid | Yes | Site Foreign Key |
| `leadTradieUserId` | uuid | Yes | Lead tradie User ID |
| `scheduledStart` | timestamp | Yes | Scheduled start |
| `scheduledEnd` | timestamp | Yes | Scheduled end |
| `completedAt` | timestamp | Yes | Completed timestamp |
| `estimatedHours` | numeric | Yes | Estimated hours |
| `quotedAmountExTax` | numeric | Yes | Quoted amount ex-tax |
| `targetMarginPct` | numeric | Yes | Per-job target profit margin (%) |
| `hasUnbilledExtras` | boolean | No | Unbilled extras flag |
| `purchaseOrderNumber` | varchar | Yes | Purchase order number |
| `internalNotes` | text | Yes | Internal notes |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_job_visits` (`tm_job_visit.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | No | Job Foreign Key |
| `title` | varchar | No | Visit title |
| `status` | varchar | No | Visit status |
| `scheduledStart` | timestamp | No | Scheduled start |
| `scheduledEnd` | timestamp | No | Scheduled end |
| `actualCheckInAt` | timestamp | Yes | Check-in timestamp |
| `actualCheckOutAt` | timestamp | Yes | Check-out timestamp |
| `checkInLat` | numeric | Yes | Check-in latitude |
| `checkInLng` | numeric | Yes | Check-in longitude |
| `checkOutLat` | numeric | Yes | Check-out latitude |
| `checkOutLng` | numeric | Yes | Check-out longitude |
| `visitNotes` | text | Yes | Visit notes |
| `clientMutationId` | varchar | Yes | Offline idempotency key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_job_visit_assignees` (`tm_job_visit_assignee.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `visitId` | uuid | No | Visit Foreign Key |
| `userId` | uuid | No | Crew User ID |
| `isLead` | boolean | No | Lead assignee flag |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_time_entries` (`tm_time_entry.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | No | Job Foreign Key |
| `visitId` | uuid | Yes | Visit Foreign Key |
| `userId` | uuid | No | Crew User ID |
| `startedAt` | timestamp | No | Start timestamp |
| `endedAt` | timestamp | Yes | End timestamp |
| `durationMinutes` | integer | No | Duration in minutes |
| `breakMinutes` | integer | No | Unpaid break duration in minutes |
| `isBillable` | boolean | No | Billable flag |
| `approvalStatus` | varchar | No | Timesheet approval status (`DRAFT`, `SUBMITTED`, `APPROVED`, `EXPORTED`) |
| `approvedBy` | uuid | Yes | Approver User ID |
| `approvedAt` | timestamp | Yes | Approval timestamp |
| `hourlyCostSnapshot` | numeric | No | Cost rate snapshot |
| `hourlyChargeSnapshot` | numeric | No | Charge rate snapshot |
| `invoicedInInvoiceId` | uuid | Yes | Invoice FK once billed |
| `notes` | text | Yes | Time entry notes |
| `clientMutationId` | varchar | Yes | Offline idempotency key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_variations` (`tm_variation.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | No | Job Foreign Key |
| `variationNumber` | varchar | No | Variation number |
| `title` | varchar | No | Variation title |
| `description` | text | Yes | Variation description |
| `status` | varchar | No | Variation status |
| `totalExTax` | numeric | No | Total ex-tax |
| `totalTax` | numeric | No | Total tax |
| `totalIncTax` | numeric | No | Total inc-tax |
| `approvedAt` | timestamp | Yes | Approval timestamp |
| `approvedByName` | varchar | Yes | Approver name |
| `signatureSvg` | text | Yes | Customer approval signature SVG path data |
| `approvalMethod` | varchar | Yes | Approval method (`ON_SCREEN_SIGN`, `SMS`, `VERBAL`) |
| `evidenceFileNoteId` | uuid | Yes | Supporting photo evidence file note FK (`file_notes.id`) |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_variation_lines` (`tm_variation_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `variationId` | uuid | No | Variation Foreign Key |
| `pricebookItemId` | uuid | Yes | Pricebook Item FK |
| `description` | varchar | No | Line description |
| `quantity` | numeric | No | Quantity |
| `unitCostExTax` | numeric | No | Unit cost ex-tax |
| `unitSellPriceExTax` | numeric | No | Unit sell price ex-tax |
| `taxCode` | varchar | No | Tax code |
| `lineTotalExTax` | numeric | No | Line total ex-tax |
| `sortOrder` | integer | No | Sort order |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_material_usages` (`tm_material_usage.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | No | Job Foreign Key |
| `visitId` | uuid | Yes | Visit Foreign Key |
| `pricebookItemId` | uuid | Yes | Pricebook Item FK |
| `description` | varchar | No | Material description |
| `quantity` | numeric | No | Quantity |
| `unitCostSnapshot` | numeric | No | Cost snapshot |
| `unitSellPriceExTax` | numeric | No | Sell price ex-tax |
| `taxCode` | varchar | No | Tax code |
| `isBillable` | boolean | No | Billable flag |
| `invoicedInInvoiceId` | uuid | Yes | Invoice FK once billed |
| `clientMutationId` | varchar | Yes | Offline idempotency key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_job_attachments` (`tm_job_attachment.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | No | Job Foreign Key |
| `visitId` | uuid | Yes | Visit Foreign Key |
| `fileNoteId` | uuid | No | Ring 2 File Note FK |
| `photoCategory` | varchar | No | Photo category |
| `visibility` | varchar | No | Attachment visibility |
| `caption` | varchar | Yes | Optional photo caption |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_quotes` (`tm_quote.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `quoteNumber` | varchar | No | Sequential quote number |
| `title` | varchar | No | Quote title |
| `description` | text | Yes | Scope description |
| `status` | varchar | No | Quote status (`DRAFT`, `SENT`, `VIEWED`, `ACCEPTED`, `DECLINED`, `EXPIRED`) |
| `customerId` | uuid | No | Customer Foreign Key (`tm_customers.id`) |
| `siteId` | uuid | Yes | Site Foreign Key (`tm_sites.id`) |
| `jobId` | uuid | Yes | Linked Job Foreign Key (`tm_jobs.id`) |
| `version` | integer | No | Quote revision version |
| `validUntil` | timestamp | Yes | Quote expiry timestamp |
| `gstMode` | varchar | No | GST calculation mode (`EXCLUSIVE`, `INCLUSIVE`, `GST_FREE`) |
| `subtotalExTax` | numeric | No | Subtotal excluding GST |
| `totalTax` | numeric | No | Total GST amount |
| `totalIncTax` | numeric | No | Total including GST |
| `depositType` | varchar | No | Deposit type (`NONE`, `PERCENT`, `FIXED`) |
| `depositValue` | numeric | No | Deposit percentage or fixed amount |
| `depositAmountDue` | numeric | No | Calculated deposit amount due |
| `portalTokenHash` | varchar | Yes | SHA-256 hash of customer portal token |
| `portalTokenEnc` | text | Yes | Sealed portal token for copy-link persistence |
| `followUpEnabled` | boolean | No | Whether automated quote follow-ups are enabled |
| `followUpStage` | integer | No | Last automated quote follow-up stage sent |
| `sentAt` | timestamp | Yes | Timestamp quote was sent |
| `viewedAt` | timestamp | Yes | Timestamp customer viewed portal |
| `acceptedAt` | timestamp | Yes | Timestamp customer accepted quote |
| `declinedAt` | timestamp | Yes | Timestamp customer declined quote |
| `declineReason` | text | Yes | Optional customer decline reason |
| `signerName` | varchar | Yes | Customer e-signature full name |
| `signatureSvg` | text | Yes | Customer e-signature SVG path data |
| `selectedOptionGroupId` | uuid | Yes | Selected Good/Better/Best option group ID |
| `pdfFileNoteId` | uuid | Yes | Generated quote PDF file note FK (`file_notes.id`) |
| `followUpSentAt` | timestamp | Yes | Timestamp automated follow-up was sent |
| `notes` | text | Yes | Customer-facing notes |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_quote_option_groups` (`tm_quote_option_group.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `quoteId` | uuid | No | Quote Foreign Key (`tm_quotes.id`) |
| `name` | varchar | No | Option group tier name (e.g. Good, Better, Best) |
| `description` | text | Yes | Option tier summary |
| `isRecommended` | boolean | No | Whether option is highlighted as recommended |
| `isSelected` | boolean | No | Whether option is currently selected |
| `sortOrder` | integer | No | Display sort order |
| `subtotalExTax` | numeric | No | Option subtotal excluding GST |
| `totalTax` | numeric | No | Option total GST |
| `totalIncTax` | numeric | No | Option total including GST |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_quote_lines` (`tm_quote_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `quoteId` | uuid | No | Quote Foreign Key (`tm_quotes.id`) |
| `optionGroupId` | uuid | Yes | Option Group Foreign Key (`tm_quote_option_groups.id`) |
| `pricebookItemId` | uuid | Yes | Pricebook Item Foreign Key (`tm_pricebook_items.id`) |
| `description` | varchar | No | Line item description |
| `quantity` | numeric | No | Quantity |
| `unitCostExTax` | numeric | No | Internal unit cost excluding GST |
| `unitSellPrice` | numeric | No | Unit sell price |
| `taxCode` | varchar | No | Tax code (`GST`, `GST_FREE`) |
| `lineTotalExTax` | numeric | No | Line total excluding GST |
| `lineTax` | numeric | No | Line GST amount |
| `lineTotalIncTax` | numeric | No | Line total including GST |
| `sortOrder` | integer | No | Display sort order |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_comm_logs` (`tm_comm_log.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `entityType` | varchar | No | Entity discriminator (`QUOTE`, `INVOICE`, `JOB`) |
| `entityId` | uuid | No | Entity UUID |
| `channel` | varchar | No | Communication channel (`EMAIL`, `PORTAL`, `SMS`, `SYSTEM`) |
| `direction` | varchar | No | Direction (`OUTBOUND`, `INBOUND`) |
| `recipient` | varchar | Yes | Recipient email or phone |
| `subject` | varchar | Yes | Message subject |
| `bodyPreview` | text | Yes | Short message preview |
| `status` | varchar | No | Delivery status (`SENT`, `FAILED`, `VIEWED`, `DELIVERED`) |
| `sentAt` | timestamp | No | Sent timestamp |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_invoices` (`tm_invoice.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `invoiceNumber` | varchar | No | Sequential invoice number |
| `invoiceType` | varchar | No | Invoice type (`DEPOSIT`, `PROGRESS`, `FINAL`) |
| `status` | varchar | No | Invoice status (`DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `DISPUTED`, `VOID`) |
| `customerId` | uuid | No | Customer Foreign Key (`tm_customers.id`) |
| `siteId` | uuid | Yes | Site Foreign Key (`tm_sites.id`) |
| `jobId` | uuid | Yes | Job Foreign Key (`tm_jobs.id`) |
| `quoteId` | uuid | Yes | Source Quote Foreign Key (`tm_quotes.id`) |
| `issueDate` | date | No | Invoice issue date |
| `dueDate` | date | No | Invoice payment due date |
| `gstRegisteredSnapshot` | boolean | No | Business GST registration snapshot at issue |
| `documentTitle` | varchar | No | ATO-compliant title (`Tax Invoice` or `Invoice`) |
| `subtotalExTax` | numeric | No | Subtotal excluding GST |
| `totalTax` | numeric | No | Total GST amount |
| `totalIncTax` | numeric | No | Total including GST |
| `amountPaid` | numeric | No | Total cash/Stripe payments received |
| `creditApplied` | numeric | No | Total credit notes/customer credit applied |
| `balanceDue` | numeric | No | Remaining balance due |
| `lockedAt` | timestamp | Yes | Financial immutability lock timestamp |
| `legalHoldUntil` | timestamp | Yes | 5-year ATO retention legal hold timestamp |
| `allowCardPayment` | boolean | No | Whether card payment is enabled on portal |
| `maxCardAmountOverride` | numeric | Yes | Optional per-invoice card payment cap |
| `portalTokenHash` | varchar | Yes | SHA-256 hash of customer portal token |
| `portalTokenEnc` | text | Yes | Sealed portal token for copy-link persistence |
| `chasingEnabled` | boolean | No | Whether automated overdue reminders are enabled |
| `chasingScheduleDaysJson` | jsonb | No | Reminder day offsets relative to due date |
| `lastChasedStage` | integer | Yes | Last chasing stage offset sent |
| `disputedReason` | text | Yes | Customer dispute reason pausing chasing |
| `pdfFileNoteId` | uuid | Yes | Generated invoice PDF file note FK (`file_notes.id`) |
| `notes` | text | Yes | Customer-facing invoice notes |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_invoice_lines` (`tm_invoice_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `invoiceId` | uuid | No | Invoice Foreign Key (`tm_invoices.id`) |
| `sourceType` | varchar | No | Line origin (`QUOTE`, `VARIATION`, `TIME`, `MATERIAL`, `DEPOSIT_DEDUCTION`, `MANUAL`) |
| `sourceId` | uuid | Yes | Source record ID |
| `pricebookItemId` | uuid | Yes | Pricebook Item Foreign Key (`tm_pricebook_items.id`) |
| `description` | varchar | No | Line item description |
| `quantity` | numeric | No | Quantity |
| `unitCostExTax` | numeric | No | Internal unit cost excluding GST |
| `unitSellPrice` | numeric | No | Unit sell price |
| `taxCode` | varchar | No | Tax code (`GST`, `GST_FREE`) |
| `lineTotalExTax` | numeric | No | Line total excluding GST |
| `lineTax` | numeric | No | Line GST amount |
| `lineTotalIncTax` | numeric | No | Line total including GST |
| `sortOrder` | integer | No | Display sort order |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_invoice_payments` (`tm_invoice_payment.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `invoiceId` | uuid | No | Invoice Foreign Key (`tm_invoices.id`) |
| `customerId` | uuid | No | Customer Foreign Key (`tm_customers.id`) |
| `amount` | numeric | No | Payment amount |
| `paymentMethod` | varchar | No | Payment method (`STRIPE_CARD`, `STRIPE_BECS`, `BANK_TRANSFER`, `CASH`, `CUSTOMER_CREDIT`) |
| `paymentDate` | timestamp | No | Payment timestamp |
| `reference` | varchar | Yes | Payment reference |
| `stripePaymentIntentId` | varchar | Yes | Stripe PaymentIntent ID |
| `stripeChargeId` | varchar | Yes | Stripe Charge ID |
| `refundedAmount` | numeric | No | Cumulative refunded amount |
| `notes` | text | Yes | Payment notes |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_credit_notes` (`tm_credit_note.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `creditNoteNumber` | varchar | No | Sequential credit note number |
| `invoiceId` | uuid | No | Invoice Foreign Key (`tm_invoices.id`) |
| `customerId` | uuid | No | Customer Foreign Key (`tm_customers.id`) |
| `reason` | text | No | Reason for issuing credit note |
| `amountExTax` | numeric | No | Credit amount excluding GST |
| `taxAmount` | numeric | No | Credit GST amount |
| `totalIncTax` | numeric | No | Total credit including GST |
| `creditDestination` | varchar | No | Destination (`INVOICE_BALANCE`, `CUSTOMER_CREDIT`) |
| `issuedAt` | timestamp | No | Issued timestamp |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_accounting_connections` (`tm_accounting_connection.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `provider` | varchar | No | Accounting provider (`XERO`, `MYOB`, `QBO`) |
| `externalTenantId` | varchar | No | External organisation/company ID |
| `externalTenantName` | varchar | Yes | External organisation display name |
| `accessTokenEnc` | text | No | Encrypted OAuth2 access token |
| `refreshTokenEnc` | text | Yes | Encrypted OAuth2 refresh token |
| `tokenExpiresAt` | timestamp | Yes | Access token expiry timestamp |
| `lastSyncedAt` | timestamp | Yes | Last successful sync timestamp |
| `syncCursor` | varchar | Yes | Provider delta sync cursor |
| `oauthState` | varchar | Yes | OAuth2 CSRF state token |
| `oauthVerifier` | text | Yes | OAuth2 PKCE code verifier |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_accounting_entity_links` (`tm_accounting_entity_link.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `provider` | varchar | No | Accounting provider (`XERO`, `MYOB`, `QBO`) |
| `entityType` | varchar | No | Synced entity type (`CUSTOMER`, `INVOICE`, `CREDIT_NOTE`, `SUPPLIER_BILL`, `TIMESHEET`) |
| `localId` | uuid | No | Local Tradie Matters entity UUID |
| `externalId` | varchar | No | External provider entity ID |
| `syncStatus` | varchar | No | Sync status (`SYNCED`, `PENDING`, `ERROR`) |
| `lastSyncHash` | varchar | Yes | Payload hash at last sync |
| `lastError` | text | Yes | Last sync error message |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_supplier_bills` (`tm_supplier_bill.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | Yes | Optional Job Foreign Key (`tm_jobs.id`) |
| `supplierName` | varchar | No | Supplier business name |
| `supplierAbn` | varchar | Yes | Supplier Australian Business Number |
| `billNumber` | varchar | Yes | Supplier invoice/bill number |
| `issueDate` | date | No | Bill issue date |
| `dueDate` | date | Yes | Bill due date |
| `subtotalExTax` | numeric | No | Subtotal excluding GST |
| `taxAmount` | numeric | No | GST amount |
| `totalIncTax` | numeric | No | Total including GST |
| `receiptFileNoteId` | uuid | Yes | Attached receipt (`file_notes.id`) |
| `source` | varchar | No | Capture source (`OCR`, `EMAIL`, `MANUAL`) |
| `status` | varchar | No | Bill status (`DRAFT`, `APPROVED`, `SYNCED`, `PAID`) |
| `appliedMarkupPct` | numeric | No | Markup percentage applied when on-charging to job |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_purchase_orders` (`tm_purchase_order.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `poNumber` | varchar | No | Sequential purchase order number |
| `jobId` | uuid | Yes | Optional Job Foreign Key (`tm_jobs.id`) |
| `supplierName` | varchar | No | Supplier business name |
| `supplierEmail` | varchar | Yes | Supplier email address |
| `status` | varchar | No | PO status (`DRAFT`, `SENT`, `BILLED`, `CANCELLED`) |
| `linesJson` | jsonb | No | Array of PO line items |
| `notes` | text | Yes | Purchase order notes |
| `sentAt` | timestamp | Yes | Timestamp when PO was emailed to supplier |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `chat_rooms` (`chat_room.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `entityType` | varchar | No | Scoped entity type (e.g. `JOB`, `CUSTOMER`, `CHANNEL`) |
| `entityId` | uuid | No | Scoped entity UUID |
| `title` | varchar | No | Room title |
| `isPinned` | boolean | No | Whether the room is pinned |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `chat_members` (`chat_member.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `roomId` | uuid | No | Room Foreign Key (`chat_rooms.id`) |
| `userId` | uuid | No | Member User ID |
| `role` | varchar | No | Member role (`OWNER`, `MEMBER`) |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `chat_messages` (`chat_message.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `roomId` | uuid | No | Room Foreign Key (`chat_rooms.id`) |
| `senderUserId` | uuid | No | Sender User ID |
| `body` | text | No | Message body text |
| `replyToMessageId` | uuid | Yes | Optional parent message UUID |
| `mentionedUserIdsJson` | jsonb | No | Array of mentioned user UUIDs |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `chat_reads` (`chat_read.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `roomId` | uuid | No | Room Foreign Key (`chat_rooms.id`) |
| `userId` | uuid | No | Reader User ID |
| `lastReadAt` | timestamp | No | Last read cursor timestamp |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_phone_numbers` (`tm_phone_number.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `e164Number` | varchar | No | Dedicated E.164 AU phone number |
| `twilioPhoneSid` | varchar | No | Twilio IncomingPhoneNumber SID |
| `missedCallAutoTextEnabled` | boolean | No | Whether missed-call auto-SMS is enabled |
| `missedCallTemplate` | text | Yes | Custom missed-call SMS template |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_sms_credit_entries` (`tm_sms_credit_entry.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `creditsDelta` | integer | No | Positive grant or negative deduction |
| `reason` | varchar | No | Entry reason (`PACK_PURCHASE`, `OUTBOUND_SMS`, `OUTBOUND_MMS`, `MISSED_CALL_AUTO`) |
| `stripeCheckoutSessionId` | varchar | Yes | Stripe Checkout Session ID for pack purchases |
| `commLogId` | uuid | Yes | Optional Comm Log Foreign Key (`tm_comm_logs.id`) |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_review_requests` (`tm_review_request.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `jobId` | uuid | Yes | Optional Job Foreign Key (`tm_jobs.id`) |
| `invoiceId` | uuid | Yes | Optional Invoice Foreign Key (`tm_invoices.id`) |
| `customerId` | uuid | No | Customer Foreign Key (`tm_customers.id`) |
| `googleReviewUrl` | text | Yes | Google Business Profile review URL |
| `publicTokenHash` | varchar | Yes | SHA-256 hash of public review token |
| `ratingScore` | integer | Yes | Customer satisfaction rating (1–5) |
| `redirectedToGoogleAt` | timestamp | Yes | Timestamp when >= 4 star rating redirected to Google |
| `sentAt` | timestamp | No | Timestamp when review request was sent |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tm_invoice_refunds` (`tm_invoice_refund.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `invoiceId` | uuid | No | Invoice Foreign Key (`tm_invoices.id`) |
| `paymentId` | uuid | No | Payment Foreign Key (`tm_invoice_payments.id`) |
| `amount` | numeric | No | Refund amount |
| `refundMethod` | varchar | No | Refund method (`STRIPE`, `MANUAL`) |
| `reason` | text | Yes | Refund reason |
| `stripeRefundId` | varchar | Yes | Stripe Refund ID |
| `refundedAt` | timestamp | No | Refunded timestamp |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |
