# FUNCTIONAL_CAPABILITIES_INVENTORY.md — Canonical UI, Route, Modal, i18n & Web/Mobile Parity Registry

> **Purpose & Agent Protocol (Token Optimization & Zero Hallucination):**  
> This file is the **single source of truth** for every Web route, Mobile route, Modal/Drawer/Bottom Sheet, Confirm Dialog, Screen-by-Screen Web/Mobile Parity mapping, `@kaesava/ui` primitive export, and `@kaesava/i18n` dictionary namespace.  
> - **Before planning or building:** Read this registry first instead of running broad repo-wide file/grep scans.  
> - **After every feature build:** Update the exact affected rows in this file whenever a route, screen, modal, UI primitive, or i18n namespace is added, modified, or removed.  
> - **Zero Redundancy Rule:** Domain math and waterfall/simulation algorithms live in `FUNCTIONAL_SPEC.md`; tRPC procedures, HTTP endpoints, Inngest workflows, and feature flags live in `TECHNICAL_SPEC.md`; database tables, columns, RLS policies, and consumers live in `SCHEMA_DATA_DICTIONARY.md`.

---

## 1. Cross-Platform UX & Component Invariants (Quick Reference)

| Dimension | Web (`apps/web` + `@kaesava/ui/web`) | Mobile (`apps/mobile` + `@kaesava/ui/mobile`) |
| :--- | :--- | :--- |
| **Primary Primitives** | `Button`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `ModalDialog`, `SlideOverDrawer`, `ConfirmDialog`, `TypedConfirmDialog`, `AmountField`, `DatePickerField`, `GenericSelectField`, `PaginationBar`, `SkeletonTable`, `SearchInput`, `PlatformSettingsShell`, `SortHeader`, `TextLink`, `HeroMetricCard`, `WebFloatingActionButton`, `LegalDocumentLayout`, `ReportFilterBar`, `TimeframeSelector`, `SetupStepperBar`, `SetupDiscardConfirm` | `MobileButton`, `MobileInput`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `AmountInput`, `ChipSelect`, `MobileModalDialog`, `MobileConfirmDialog`, `showMobileConfirm`, `MobilePaginationBar`, `BankProviderBadge`, `MobileEnvelopePicker`, `SkeletonCard`, `MobilePlatformSettingsShell`, `MobileHeroCard`, `MobileFloatingActionButton`, `MobileCardRow`, `MobileFilterTriggerButton`, `SetupProgressBar`, `MobileLegalLinks` |
| **Modals & Dirty State** | `ModalDialog` / `SlideOverDrawer` with LIFO `Escape` stack (`modalStack.ts`), `< sm` bottom-sheet layout (`max-h-[92dvh]`, safe-area footer), and `isDirty` discard confirmation via `ConfirmDialog`. Native `confirm()` is banned. | `MobileModalDialog` bottom-sheet with Android back-button interception and `isDirty` discard confirmation via `MobileConfirmDialog` (`showMobileConfirm`). Native `Alert.alert` is banned. |
| **Forms & Inputs** | Standard `h-10` height; `text-base md:text-sm` to prevent iOS Safari focus zoom; first editable field has `autoFocus`; submit disabled while `!isDirty \|\| !isValid`; loading spinner on mutation. | `44dp` minimum touch target; first editable field focused; `AmountInput` uses `selectTextOnFocus`; submit disabled while `!isDirty \|\| !isValid`. |
| **Tables, Cards & Pagination** | Left: text/names; Center: dates/badges/actions; Right: `font-mono tabular-nums` amounts. Render `PaginationBar` only when `totalItems >= 5`. | Structured cards with `SkeletonCard` loading state. Render `MobilePaginationBar` only when `totalItems >= 5`. |
| **Formatting & i18n** | 100% strings from `@kaesava/i18n` (`en.ts`). Currency via `useCurrencyLocale()`; dates via `fmtDate` / `fmtDateMedium` in user presentation timezone. | 100% strings from `@kaesava/i18n` (`en.ts`). Currency via `formatMobileCurrency`; dates via `formatDate` in user presentation timezone. |

---

## 2. Web Routes & Screens Inventory (`apps/web/src/app` — 36 Files)

| Web Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Drawers Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/web/src/app/layout.tsx` | 168 | Public / Root | `TRPCProvider`, `ThemeProvider`, `ToastContainer`, `PostHogProvider`, `CookieConsentBanner` |
| Global Error | `apps/web/src/app/global-error.tsx` | 60 | Public | Next.js global error boundary (`<html><body>`) |
| Global 404 | `apps/web/src/app/not-found.tsx` | 58 | Public | Top-level 404 screen with link to `/` and `/dashboard` |
| `/` | `apps/web/src/app/page.tsx` | 15 | Public (SSR + `metadata`) | `LandingPageClient` (`LandingHeader`, `LandingHero`, `ProductFeaturesGrid`, `InteractivePaydayEngine` + `LandingAffordSimulatorTab`, `FeaturedBlogsSection`, `PricingSection`, `TrustSection`, `FaqSection`, `LandingFooter`, `AuthModal`, `EarlyAccessModal`) |
| `/sign-in` | `apps/web/src/app/sign-in/page.tsx` | 120 | Public (`<Suspense>`) | `SignInForm`, `SocialAuthButtons` |
| `/sign-up` | `apps/web/src/app/sign-up/page.tsx` | 134 | Public (`<Suspense>`) | `SignUpForm`, `SocialAuthButtons` |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | 330 | Public | Multi-step email/OTP/new-password reset flow (`OtpInput`, `PasswordStrengthIndicator`) |
| `/reset-password` | `apps/web/src/app/reset-password/page.tsx` | 167 | Public (`<Suspense>`) | Token-based password reset form (`PasswordStrengthIndicator`) |
| `/auth-callback` | `apps/web/src/app/auth-callback/page.tsx` | 120 | Public (`<Suspense>`) | Exchanges `neon_auth_session_verifier`, forwards OAuth errors, routes `/invite/*`, `/complete-profile`, `/setup`, or `moneymatters://auth-callback` |
| `/complete-profile` | `apps/web/src/app/complete-profile/page.tsx` | 215 | Authenticated | Post-OAuth Name, Country/Currency/Timezone & Terms confirmation (`trpc.createTenant`) |
| `/dev-callback/[...slug]` | `apps/web/src/app/dev-callback/[...slug]/page.tsx` | 76 | Dev-only | Local OAuth callback bridge |
| `/invite/[token]` | `apps/web/src/app/invite/[token]/page.tsx` | 96 | Public / Auth | Inline household partner invitation onboarding & acceptance (`InviteAuthCard`, `InviteNewUserForm`, `InviteExistingUserForm`, `InviteStatusCard`, `trpc.getInviteDetails`, `trpc.acceptInvite`) |
| `/privacy` | `apps/web/src/app/privacy/page.tsx` | 179 | Public (SSR + `metadata`) | Privacy Policy page (`PublicHeader`, `PublicFooter`) |
| `/terms` | `apps/web/src/app/terms/page.tsx` | 149 | Public (SSR + `metadata`) | Terms of Service page (`PublicHeader`, `PublicFooter`) |
| `/blog` | `apps/web/src/app/blog/page.tsx` | 139 | Public (SSR + `metadata`) | Blog index (`BLOG_POSTS` from `apps/web/src/lib/blog-data.ts`) |
| `/blog/[slug]` | `apps/web/src/app/blog/[slug]/page.tsx` | 206 | Public (SSR + `generateMetadata` + `opengraph-image.tsx`) | Blog article detail (`BLOG_POSTS`, `BlogReadTracker`) |
| `/setup` | `apps/web/src/app/setup/page.tsx` | 400 | Authenticated | 5-step setup wizard (`SetupHeaderBar`, `SetupBankAccountsStep`, `SetupIncomeStep`, `SetupLifestyleStep`, `SetupGoalsStep`, `SetupCategoriesStep`, `EnvelopeFormModal`, `SetupDiscardModal`, `PaydaySandboxModal`) |
| `/subscription/upgrade` | `apps/web/src/app/subscription/upgrade/page.tsx` | 255 | Authenticated (`<Suspense>`) | Plan selection & Stripe Checkout redirect (`ActiveSubscriptionCard`, `trpc.billing.createCheckoutSession`) |
| `/subscription/success` | `apps/web/src/app/subscription/success/page.tsx` | 130 | Authenticated (`<Suspense>`) | Checkout verification (`trpc.billing.verifyCheckoutSession`) |
| `/dashboard` (Layout) | `apps/web/src/app/dashboard/layout.tsx` | 499 | Authenticated + Tenant | `ProductTourProvider`, `FileNotesProvider`, `DashboardDesktopSidebar`, `DashboardMobileHeader`, `DashboardMobileDrawer`, `DashboardMobileFab`, `DashboardFooter`, `TrialBanner`, `useDashboardSearchAndShortcuts`, `DashboardPennyHandler`, `DashboardLayoutModals`, `CommandPaletteModal`, `FeedbackModal`, `KeyboardShortcutsModal` |
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` | 364 | Authenticated + Tenant | `DashboardActionStrip`, `BentoPoolsSection`, `NextPaydayCard`, `GoalsProgressStrip`, `BalanceMatchNudgeBanner`, `AttentionItemsList`, `BankAccountsSection`, `DashboardModals` (`QuickActionDrawer`, `ReconciliationModal`, `EnvelopeFormModal`, `AffordCheckModal`, `MarkPaidModal`, `TransferModal`) |
| `/dashboard/envelopes` | `apps/web/src/app/dashboard/envelopes/page.tsx` | 475 | Authenticated + Tenant | `EnvelopesFilterBar`, `PoolsTable`, `PoolTableRowItem`, `QuickActionDrawer`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `ConfirmDialog`, `FileNotesDrawer` |
| `/dashboard/income-and-bills` | `apps/web/src/app/dashboard/income-and-bills/page.tsx` | 503 | Authenticated + Tenant (`<Suspense>`) | 3 tabs: `UpcomingTimelineTab` (`TimelineFiltersBar`, `TimelineEventsTable`, `TimelineModals`), `MatrixPlanTab` (`MatrixTableHeader`, `MatrixCellInput`), and Schedules (`IncomeSchedulesCard`, `BillSchedulesCard`, `IncomeFormModal`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer`) |
| `/dashboard/income-split` | `apps/web/src/app/dashboard/income-split/page.tsx` | 44 | Authenticated + Tenant (`<Suspense>`) | Renders `IncomeSplitScreen` (`PaydayCelebrationCard`, `PaydayMetricsGrid`, `IncomeEventInlineCard`, `DestinationTransferItem`, `IncomeSplitPoolTable`, `IncomeSplitModals`, `UnsavedSplitExitDialog`, `FileNotesDrawer`) |
| `/dashboard/bank-accounts` | `apps/web/src/app/dashboard/bank-accounts/page.tsx` | 22 | Authenticated + Tenant | Redirects to `/dashboard/settings?tab=bank-accounts` |
| `/dashboard/history` | `apps/web/src/app/dashboard/history/page.tsx` | 88 | Authenticated + Tenant (`<Suspense>`) | 2 tabs: `TransactionsTab` and `PaydayAllocationsTab` (`SlideOverAllocationDrawer`, `FileNotesDrawer`) |
| `/dashboard/afford-check` | `apps/web/src/app/dashboard/afford-check/page.tsx` | 16 | Authenticated + Tenant | Renders `AffordCheckScreen` (`AffordCheckVerdict`, `AffordCheckBreakdown`, `GoalDelayCard`, `AffordCheckSkeleton`) |
| `/dashboard/reports` | `apps/web/src/app/dashboard/reports/page.tsx` | 311 | Authenticated + Tenant + `reports` flag | `SpendingOverviewCard` (`DonutChart`, `BarTrendChart`, `HorizontalRankedBarChart`), KPI summary cards, CSV export |
| `/dashboard/settings` | `apps/web/src/app/dashboard/settings/page.tsx` | 268 | Authenticated + Tenant | `PlatformSettingsShell` 4-tab settings (`ProfileSection`, `HouseholdDetailsSection`, `HouseholdMemberInviteSection`, `HouseholdDangerZoneSection`, `AllocationStrategySection`, `SubscriptionSection`, `PrivacySection`, `ArchivedSection`, `FeedbackModal`, `ConfirmDialog`, version footer) |
| `/dashboard/settings/allocation-rules` | `apps/web/src/app/dashboard/settings/allocation-rules/page.tsx` | 398 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder with Preset Switcher (`ConfirmDialog`) |
| `/dashboard/settings/notifications` | `apps/web/src/app/dashboard/settings/notifications/page.tsx` | 163 | Authenticated + Tenant | Notification toggles (`trpc.notifications.getPreferences`, `trpc.notifications.updatePreferences`) |
| `/dashboard/settings/history` | `apps/web/src/app/dashboard/settings/history/page.tsx` | 41 | Authenticated + Tenant | Redirects to `/dashboard/history` |
| `/dashboard/[...not-found]` | `apps/web/src/app/dashboard/[...not-found]/page.tsx` | 108 | Authenticated + Tenant | Scoped dashboard 404 screen |
| `/api/auth/[...auth]` | `apps/web/src/app/api/auth/[...auth]/route.ts` | 234 | Public / Cookie | Next.js Neon Auth proxy + CSRF origin check + rate-limit header forwarding |
| `/api/trpc/[trpc]` | `apps/web/src/app/api/trpc/[trpc]/route.ts` | 227 | Public / Cookie | Next.js tRPC proxy to Cloudflare Worker API (`NEXT_PUBLIC_API_URL`) |
| `/api/file-notes/[...path]` | `apps/web/src/app/api/file-notes/[...path]/route.ts` | 91 | Authenticated / Cookie | Same-origin file notes upload (`PUT`) & download (`GET`) proxy to Cloudflare Worker API |
| `/robots.txt` & `/sitemap.xml` | `apps/web/src/app/robots.ts` (21L), `sitemap.ts` (74L) | 95 | Public | Search engine metadata routes |

### 2.2 Tradie Matters Web Routes (`apps/tradie-matters/web/src/app` — 35 Route Files)

| Web Route | File Path | Auth / Guard | Primary Components / Features Rendered |
| :--- | :--- | :--- | :--- |
| `/` | `apps/tradie-matters/web/src/app/page.tsx` | Public (SSR) | `TradiePublicHeader`, `TradiePublicFooter`, marketing hero & feature overview |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth-callback`, `/complete-profile`, `/invite/[token]` | `apps/tradie-matters/web/src/app/{sign-in,sign-up,forgot-password,reset-password,auth-callback,complete-profile,invite/[token]}/page.tsx` | Public / Auth | Neon Auth flows, Google OAuth callback, business profile setup, team member invite acceptance |
| `/privacy`, `/terms` | `apps/tradie-matters/web/src/app/{privacy,terms}/page.tsx` | Public (SSR) | Australian legal pages (`LegalDocumentLayout`) |
| `/setup` | `apps/tradie-matters/web/src/app/setup/page.tsx` | Authenticated | 3-step business onboarding (Business & ABN/GST, Rates & Crew, Payments/Stripe Connect) |
| `/q/[token]` | `apps/tradie-matters/web/src/app/q/[token]/page.tsx` | Public (Token) | Customer Quote Portal (`portalQuote.view`, Good/Better/Best option selection, `SignaturePad` accept/decline) |
| `/i/[token]` | `apps/tradie-matters/web/src/app/i/[token]/page.tsx` | Public (Token) | Customer Tax Invoice Portal (`portalInvoice.view`, ATO GSTR 2013/1 display, Stripe Connect BECS/Card checkout) |
| `/subscription/{upgrade,success,expired}` | `apps/tradie-matters/web/src/app/subscription/{upgrade,success,expired}/page.tsx` | Authenticated | Plan picker (`Solo`, `Founding Crew`, `Small Crew`), Stripe checkout verification, expired gate |
| `/dashboard` | `apps/tradie-matters/web/src/app/dashboard/page.tsx` | Authenticated + Tenant | Weekly Payday Cash Readiness Pulse, Today's Jobs, Open Quotes/Invoices KPIs |
| `/dashboard/inbox` | `apps/tradie-matters/web/src/app/dashboard/inbox/page.tsx` | Authenticated + Tenant | Lead & SMS/MMS Inbox (`sms`, `jobs` `LEAD` pipeline) |
| `/dashboard/schedule` | `apps/tradie-matters/web/src/app/dashboard/schedule/page.tsx` | Authenticated + Tenant | Drag-and-drop Dispatch Board (`ResourceDayTimeline`, `ResourceWeekGrid`, `UnscheduledBacklogColumn`) |
| `/dashboard/jobs`, `/dashboard/jobs/[id]` | `apps/tradie-matters/web/src/app/dashboard/jobs/{page,[id]/page}.tsx` | Authenticated + Tenant | Jobs list & detail (visits, time entries, variations, materials, `FileNotesDrawer`, `ChatThreadPanel`, Live Job Margin) |
| `/dashboard/quotes`, `/dashboard/quotes/[id]` | `apps/tradie-matters/web/src/app/dashboard/quotes/{page,[id]/page}.tsx` | Authenticated + Tenant | Quotes list & Good/Better/Best quote builder/detail |
| `/dashboard/invoices`, `/dashboard/invoices/[id]` | `apps/tradie-matters/web/src/app/dashboard/invoices/{page,[id]/page}.tsx` | Authenticated + Tenant | Invoices list & ATO GSTR 2013/1 Tax Invoice detail, payments, credit notes, refunds, Stripe Connect |
| `/dashboard/customers` | `apps/tradie-matters/web/src/app/dashboard/customers/page.tsx` | Authenticated + Tenant | Customers & Service Sites CRM (`SmartAddressField`, `ContactLinks`, `DetailDrawer`) |
| `/dashboard/pricebook` | `apps/tradie-matters/web/src/app/dashboard/pricebook/page.tsx` | Authenticated + Tenant | Pricebook items, starter pack installer, `CsvImportWizardModal` |
| `/dashboard/timesheets` | `apps/tradie-matters/web/src/app/dashboard/timesheets/page.tsx` | Authenticated + Tenant | Crew time entries & approval (`timesheets.list`, `timesheets.approve`) |
| `/dashboard/suppliers` | `apps/tradie-matters/web/src/app/dashboard/suppliers/page.tsx` | Authenticated + Tenant | Supplier Bills, Purchase Orders, Receipt OCR extraction |
| `/dashboard/activity` | `apps/tradie-matters/web/src/app/dashboard/activity/page.tsx` | Authenticated + Tenant | Activity & Comms log (`ActivityHistoryTable`) |
| `/dashboard/settings`, `/dashboard/settings/notifications` | `apps/tradie-matters/web/src/app/dashboard/settings/{page,notifications/page}.tsx` | Authenticated + Tenant | `PlatformSettingsShell` (Business/ABN/GST, Crew & Rates, Accounting Sync Xero/MYOB/QBO, SMS Credits, Billing, Notifications) |
| `/api/{auth/[...auth],trpc/[trpc],file-notes/[...path]}` | `apps/tradie-matters/web/src/app/api/*` | Proxy | Same-origin Next.js edge proxies to Neon Auth and Tradie Matters Worker API |

---

## 3. Mobile Routes & Screens Inventory (`apps/mobile/src/app` — 37 Files)

| Mobile Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Sheets Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/mobile/src/app/_layout.tsx` | 118 | Public / Root | `AppProviders` (`TRPCProvider`, `CurrencyLocaleProvider`, `DateLocaleProvider`, `IconVisibilityProvider`, `MobileToastProvider`, `NotificationServiceProvider`, `ProductTourProvider`, `SetupWizardProvider`, `FileNotesProvider`), `BiometricLockOverlay`, `MobileConfirmContainer`, `MobileToastContainer` |
| `/` (Entry Redirect) | `apps/mobile/src/app/index.tsx` | 43 | Public / Auth | Redirects to `/(auth)/sign-in`, `/(setup)/accounts`, or `/(app)/home` |
| `+not-found` | `apps/mobile/src/app/+not-found.tsx` | 86 | Public | Unmatched route screen |
| `(auth)` Layout | `apps/mobile/src/app/(auth)/_layout.tsx` | 14 | Public | Expo Router `Stack` for auth screens |
| `/(auth)/sign-in` | `apps/mobile/src/app/(auth)/sign-in.tsx` | 149 | Public | `SignInEmailPasswordFields`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/sign-up` | `apps/mobile/src/app/(auth)/sign-up.tsx` | 191 | Public | `SignUpFormFields`, `SignUpTermsCheckbox`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/forgot-password` | `apps/mobile/src/app/(auth)/forgot-password.tsx` | 219 | Public | `ForgotPasswordEmailStep`, `ForgotPasswordOtpStep`, `ForgotPasswordSuccessStep` |
| `/(auth)/reset-password` | `apps/mobile/src/app/(auth)/reset-password.tsx` | 240 | Public | Deep-link token password reset screen (`MobilePasswordStrength`) |
| `/(auth)/invite/[token]` | `apps/mobile/src/app/(auth)/invite/[token].tsx` | 115 | Public / Auth | Inline partner invite onboarding & acceptance (`MobileInviteAuthCard`, `MobileInviteStatusCard`, `trpc.getInviteDetails`, `trpc.acceptInvite`) |
| `/(auth)/auth-callback` | `apps/mobile/src/app/(auth)/auth-callback.tsx` | 105 | Public / Deep Link | Handles `moneymatters://auth-callback?token=...`, stores session, routes to `complete-profile`, `setup`, or `home` |
| `/(auth)/complete-profile` | `apps/mobile/src/app/(auth)/complete-profile.tsx` | 120 | Authenticated | Post-OAuth Name, Country/Currency/Timezone & Terms confirmation (`useCompleteProfile`, `trpc.createTenant`) |
| `(setup)` Layout | `apps/mobile/src/app/(setup)/_layout.tsx` | 19 | Authenticated | Expo Router `Stack` for setup wizard |
| `/(setup)/income` | `apps/mobile/src/app/(setup)/income.tsx` | 343 | Authenticated | Step 1: `SetupProgressBar`, income schedule inputs, `RecurrenceBuilder` |
| `/(setup)/bank-accounts` | `apps/mobile/src/app/(setup)/bank-accounts.tsx` | 124 | Authenticated | Step 2: `SetupProgressBar`, `SetupBankAccountsHeader`, `SetupBankAccountCard` |
| `/(setup)/goals` | `apps/mobile/src/app/(setup)/goals.tsx` | 401 | Authenticated | Step 3: `SetupProgressBar`, `SetupGoalsPresetsGrid`, `SetupGoalCard` |
| `/(setup)/lifestyle` | `apps/mobile/src/app/(setup)/lifestyle.tsx` | 351 | Authenticated | Step 4: `SetupProgressBar`, `LifestyleChildSubCard`, `LifestyleVehicleSubCard`, `MobileDiscretionarySliders` |
| `/(setup)/envelopes` | `apps/mobile/src/app/(setup)/envelopes.tsx` | 499 | Authenticated | Step 5: `SetupProgressBar`, `SetupCategoriesGoalsList`, `SetupCategoryRow`, `EnvelopeFormModal`, `MobilePaydaySandboxModal` |
| `(app)` Tabs Layout | `apps/mobile/src/app/(app)/_layout.tsx` | 265 | Authenticated + Tenant | Bottom Tabs (`home`, `plan`, `envelopes`, `history`) + hidden stack routes (`bank-accounts`, `reports`, `payday-plan`, `payday-plan/[id]`, `plan/schedules`, `settings`, `afford-check`, `envelopes/[id]`, `envelopes/projection`, `settings/*`), `CommandPaletteProvider`, `QuickActionFab`, `QuickExpenseModal`, `MobileCommandPaletteSheet`, `MobileAnalyticsConsentPrompt` |
| `/(app)/home` | `apps/mobile/src/app/(app)/home.tsx` | 232 | Authenticated + Tenant | `TrialBanner`, `DashboardHeroCard`, `MobileNextPaydayCard`, `GoalsProgressStrip`, `AttentionItemsList`, `EnvelopeFormModal`, `BankAccountFormModal`, `MobileSyncBalanceModal`, `MarkPaidModal`, `MobileTransferModal`, `MobileAffordCheckModal`, `QuickExpenseModal` |
| `/(app)/bank-accounts` | `apps/mobile/src/app/(app)/bank-accounts.tsx` | 40 | Authenticated + Tenant | Standalone Bank Accounts screen (`MobileBankAccountsSection`, `BankAccountFormModal`, `MobileSyncBalanceModal`, `LinkedEnvelopesModalSheet`, `NotesFeedModal`) |
| `/(app)/envelopes` | `apps/mobile/src/app/(app)/envelopes.tsx` | 254 | Authenticated + Tenant | `PoolSummaryCard`, `PoolGroupSection`, `PoolItemCard`, `EnvelopesFilterSheet`, `EnvelopeFormModal`, `MobileEnvelopeDetailSheet`, `PoolOverflowMenuModal`, `QuickExpenseModal` |
| `/(app)/envelopes/[id]` | `apps/mobile/src/app/(app)/envelopes/[id].tsx` | 186 | Authenticated + Tenant | Envelope detail route (`PoolUpcomingSection`, `PoolHistorySection`, `EnvelopeFormModal`, `NotesFeedModal`) |
| `/(app)/envelopes/projection` | `apps/mobile/src/app/(app)/envelopes/projection.tsx` | 172 | Authenticated + Tenant | `ProjectionScrubber`, `ProjectionEnvelopeGroupSection`, `ProjectionEnvelopeCard` |
| `/(app)/plan` | `apps/mobile/src/app/(app)/plan.tsx` | 230 | Authenticated + Tenant | Upcoming Timeline (`UpcomingEventsTab`, `PaychecksModalManager`) |
| `/(app)/plan/schedules` | `apps/mobile/src/app/(app)/plan/schedules.tsx` | 284 | Authenticated + Tenant | Dedicated schedules management screen (`IncomeSourceCard`, `ExpenseBillCard`, `IncomeExpenseFormModal`, `EnvelopeFormModal`, `MobileBurstModal`) |
| `/(app)/payday-plan` | `apps/mobile/src/app/(app)/payday-plan.tsx` | 60 | Authenticated + Tenant | 12-Month Horizon Matrix (`MobileHorizonPlanTab`) |
| `/(app)/payday-plan/[id]` | `apps/mobile/src/app/(app)/payday-plan/[id].tsx` | 236 | Authenticated + Tenant | `MobilePaydayCelebrationCard`, `MobilePaydayMetricsGrid`, `MobileIncomeEventInlineCard`, `MobilePaydayPlanEnvelopeList`, `MobilePaydayActionButtons`, `MobilePaydayTransferModal`, `MobileUnsavedPaydayPlanExitDialog` |
| `/(app)/history` | `apps/mobile/src/app/(app)/history.tsx` | 192 | Authenticated + Tenant | Segmented tabs: `LedgerHistoryTab` and `PaydayPlansTab`, `HistoryDetailSheet`, `MobilePaydayPlanDetailModal` |
| `/(app)/afford-check` | `apps/mobile/src/app/(app)/afford-check.tsx` | 140 | Authenticated + Tenant | `AffordCheckInputControls`, `AffordCheckVerdictCard`, `AffordCheckBreakdownCard` |
| `/(app)/reports` | `apps/mobile/src/app/(app)/reports.tsx` | 350 | Authenticated + Tenant + `reports` flag | `MobileSpendingOverviewCard` (`MobileDonutChart`, `MobileBarTrendChart`, `MobileHorizontalRankedBarChart`) |
| `/(app)/settings` | `apps/mobile/src/app/(app)/settings.tsx` | 345 | Authenticated + Tenant | 4 tabs (`profile`, `household`, `archived`, `account-data`): `MobileProfileSection`, `HouseholdDetailsSection`, `HouseholdMemberInviteSection`, `MobileAllocationStrategySection`, `Recalibrate Plan`, `HouseholdDangerZoneSection`, `MobileArchivedSection`, `MobileSubscriptionSection`, `PrivacyGovernanceSection`, `SettingsVersionFooter`, `FeedbackFormModal`, `MobileHouseholdSwitcherModal` |
| `/(app)/settings/allocation-rules` | `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` | 389 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder with Preset Switcher |
| `/(app)/settings/archived` | `apps/mobile/src/app/(app)/settings/archived.tsx` | 36 | Authenticated + Tenant | Standalone wrapper around `MobileArchivedSection` |
| `/(app)/settings/notifications` | `apps/mobile/src/app/(app)/settings/notifications.tsx` | 109 | Authenticated + Tenant | Notification preferences screen (`SwitchRow`) |

### 3.2 Tradie Matters Mobile Routes (`apps/tradie-matters/mobile/src/app` — 32 Files)

| Mobile Route | File Path | Auth / Guard | Primary Components / Sheets Rendered |
| :--- | :--- | :--- | :--- |
| Root & Entry | `_layout.tsx`, `index.tsx` | Public / Root | `AppProviders` (`OutboxSyncWrapper`, `FileNotesProvider`), `tradiematters://` routing |
| `(auth)/*` | `(auth)/{_layout,sign-in,sign-up,forgot-password,reset-password,invite/[token],auth-callback,complete-profile}.tsx` | Public / Auth | Neon Auth, OAuth deep-link callback, team invite acceptance, profile completion |
| `(setup)/*` | `(setup)/{_layout,business,rates,payments}.tsx` | Authenticated | 3-step mobile business setup (Business/ABN/GST, Crew Rates, Stripe Connect / PayID) |
| `/(app)/today` | `apps/tradie-matters/mobile/src/app/(app)/today.tsx` | Authenticated + Tenant | `MobilePaydayCashPulseCard`, `MobileWeekStrip`, `MobileDailyAgendaList`, `MobileVisitAgendaCard` |
| `/(app)/inbox` | `apps/tradie-matters/mobile/src/app/(app)/inbox.tsx` | Authenticated + Tenant | `InboxLeadCard`, `SmsThreadModal` |
| `/(app)/jobs`, `/(app)/jobs/[id]` | `apps/tradie-matters/mobile/src/app/(app)/jobs/{index,[id]}.tsx` | Authenticated + Tenant | `CreateJobModal`, `CheckInOutTimerBar`, `OnMyWaySmsButton`, `VariationCaptureSheet`, `MaterialQuickAddSheet`, `ReceiptSnapOcrSheet`, `JobPhotoCaptureSheet`, `JobCrewChatSheet`, `MobileJobProfitBar`, `JobNotesCard` |
| `/(app)/quotes`, `/(app)/quotes/[id]` | `apps/tradie-matters/mobile/src/app/(app)/quotes/{index,[id]}.tsx` | Authenticated + Tenant | `QuoteBuilderModal`, `QuoteLineEditor`, `PricebookPickerModal`, `QuoteSignAcceptModal` (`MobileSignaturePad`) |
| `/(app)/invoices`, `/(app)/invoices/[id]` | `apps/tradie-matters/mobile/src/app/(app)/invoices/{index,[id]}.tsx` | Authenticated + Tenant | `ConvertJobInvoiceSheet`, `MobileRecordPaymentSheet`, `MobileCreditNoteSheet`, `MobilePayIdShowCard` |
| `/(app)/customers`, `/(app)/customers/[id]` | `apps/tradie-matters/mobile/src/app/(app)/customers/{index,[id]}.tsx` | Authenticated + Tenant | `CustomerFormModal`, `SiteFormModal`, `MobileSmartAddressField` |
| `/(app)/pricebook` | `apps/tradie-matters/mobile/src/app/(app)/pricebook.tsx` | Authenticated + Tenant | `PricebookItemModal`, starter pack & search |
| `/(app)/timesheets`, `/(app)/activity` | `apps/tradie-matters/mobile/src/app/(app)/{timesheets,activity}.tsx` | Authenticated + Tenant | Crew timesheet approval; `MobileActivityHistoryList`, `MobileActivityDetailSheet` |
| `/(app)/settings`, `/(app)/settings/{archived,notifications}` | `apps/tradie-matters/mobile/src/app/(app)/settings*.tsx` | Authenticated + Tenant | `MobilePlatformSettingsShell`, `SettingsAccountTab`, archived items, notification preferences |

---

## 4. Modals, Drawers, Bottom Sheets & Confirm Dialogs Registry

### 4.1 Web Modals, Drawers & Confirm Dialogs (30 Components)

| Component / Dialog Name | File Path | Lines | Primitive Used | Notes / Status |
| :--- | :--- | ---: | :--- | :--- |
| `CommandPaletteModal` | `packages/ui/src/web/CommandPaletteModal.tsx` | 290 | `createPortal` modal | Shared in `@kaesava/ui/web` (`⌘K` / `/` search across Accounts, Envelopes, `PENDING` Events, Pages/Actions, Transactions + Smart Priority Ask Penny AI with `CommandPaletteResultsList.tsx` & `CommandPaletteActionRow.tsx`) |
| `FileNotesDrawer` | `packages/capabilities/file-notes/src/web/FileNotesDrawer.tsx` | 316 | `SlideOverDrawer`, `ConfirmDialog` | Shared capability drawer for attaching/viewing PDF/image notes |
| `QuickActionDrawer` (`QuickExpenseDrawer`) | `apps/web/src/components/web/QuickExpenseDrawer.tsx` | 371 | `SlideOverDrawer`, `ConfirmDialog` | Renders `CrossBankTransferModal` and `MarkPaidModal` |
| `EnvelopeFormModal` | `apps/web/src/components/web/EnvelopeFormModal.tsx` | 383 | `ModalDialog`, `EnvelopeFormConfirmDialogs` (`ConfirmDialog` x3, `CrossBankTransferModal`) | Merged Create/Edit envelope & bill schedule modal (`isEdit`), same-privacy bank re-linking |
| `IncomeFormModal` | `apps/web/src/components/web/IncomeFormModal.tsx` | 393 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit income schedule modal (`isEdit`) |
| `MarkPaidModal` | `apps/web/src/app/dashboard/income-and-bills/components/MarkPaidModal.tsx` | 324 | `ModalDialog` | Shortfall resolution & bill payment confirmation modal |
| `TransferModal` | `apps/web/src/components/web/TransferModal.tsx` | 338 | `ModalDialog`, `ConfirmDialog` | Scheduled/pending transfer confirmation modal |
| `CrossBankTransferModal` | `apps/web/src/components/web/CrossBankTransferModal.tsx` | 106 | `ModalDialog` | Cross-bank physical transfer reminder modal |
| `EditUpcomingEventModal` | `apps/web/src/components/web/EditUpcomingEventModal.tsx` | 225 | `ModalDialog` | Edit upcoming income/expense event occurrence |
| `AffordCheckModal` | `apps/web/src/components/web/AffordCheckModal.tsx` | 130 | `ModalDialog` | Dashboard "Can I Afford It?" quick modal |
| `FeedbackModal` | `apps/web/src/components/web/FeedbackModal.tsx` | 194 | `ModalDialog` | Bug report / feedback submission (`trpc.submitFeedback`) |
| `AvatarCropModal` | `apps/web/src/components/web/AvatarCropModal.tsx` | 188 | `ModalDialog` | Avatar zoom/crop canvas modal |
| `TourWelcomeModal` | `apps/web/src/components/web/TourWelcomeModal.tsx` | 62 | `ModalDialog` | Product tour welcome prompt |
| `KeyboardShortcutsModal` | `apps/web/src/app/dashboard/components/KeyboardShortcutsModal.tsx` | 48 | `ModalDialog` | `?` keyboard shortcuts cheat-sheet modal |
| `BankAccountFormModal` | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountFormModal.tsx` | 326 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit bank account modal (`isEdit`) |
| `PaydayTransferModal` | `apps/web/src/app/dashboard/income-split/components/PaydayTransferModal.tsx` | 204 | `ModalDialog` | Post-payday bank transfer checklist modal |
| `PaydaySandboxModal` | `apps/web/src/app/setup/components/PaydaySandboxModal.tsx` | 156 | `ModalDialog` | Setup wizard payday simulation modal |
| `SetupDiscardModal` | `apps/web/src/app/setup/components/SetupDiscardModal.tsx` | 24 | `ConfirmDialog` | Setup wizard discard confirmation |
| `SyncBalanceModal` | `apps/web/src/components/SyncBalanceModal.tsx` | 345 | `ModalDialog` | Match Balance modal |
| `BankAccountTable` (Linked Envelopes Modal) | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountTable.tsx` | 328 | `ModalDialog` | Inline linked-envelopes modal |
| `ScheduleBurstModal` | `apps/web/src/app/dashboard/plan/components/ScheduleBurstModal.tsx` | 150 | `ModalDialog`, `ConfirmDialog`, `EditUpcomingEventModal` | Schedule occurrence list & inline edit modal (`INCOME` / `EXPENSE`) |
| `UnsavedPaydayPlanExitDialog` | `apps/web/src/app/dashboard/payday-plan/components/UnsavedPaydayPlanExitDialog.tsx` | 40 | `ConfirmDialog` | Unsaved payday split exit dialog |
| `AuthModal` | `apps/web/src/components/landing/AuthModal.tsx` | 190 | Custom `<div role="dialog">` | Landing page auth modal |
| `EarlyAccessModal` | `apps/web/src/components/landing/EarlyAccessModal.tsx` | 121 | Custom `<div role="dialog">` | Early access waitlist modal |
| `SlideOverPaydayPlanDrawer` | `apps/web/src/components/web/SlideOverPaydayPlanDrawer.tsx` | 155 | `SlideOverDrawer`, `Button` | Historical payday split drawer |
| `EnvelopeDetailDrawer` | `apps/web/src/app/dashboard/plan/components/EnvelopeDetailDrawer.tsx` | 313 | `SlideOverDrawer`, `Tabs` | Envelope detail drawer |
| `DashboardMobileDrawer` | `apps/web/src/app/dashboard/components/DashboardMobileDrawer.tsx` | 34 | Custom mobile nav drawer | Responsive sidebar drawer for `<768px` viewports |
| `PartnerInviteSection` (Role/Revoke Confirms) | `apps/web/src/app/dashboard/settings/components/PartnerInviteSection.tsx` | 165 | `TypedConfirmDialog`, `ConfirmDialog` | Ownership transfer & invite revocation dialogs |
| `HouseholdDangerZoneSection` (Leave/Delete) | `apps/web/src/app/dashboard/settings/components/HouseholdDangerZoneSection.tsx` | 170 | `TypedConfirmDialog` (x2) | Leave household & delete household typed confirmations |
| `TimelineModals` | `apps/web/src/app/dashboard/income-and-bills/components/timeline/TimelineModals.tsx` | 210 | `ConfirmDialog`, `MarkPaidModal`, `TransferModal`, `EditUpcomingEventModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer` | Orchestrates modals for `UpcomingTimelineTab` |
| `IncomeSplitModals` | `apps/web/src/app/dashboard/income-split/components/IncomeSplitModals.tsx` | 165 | `ConfirmDialog` (x3), `PaydayTransferModal`, `EnvelopeDetailDrawer`, `EnvelopeFormModal` | Orchestrates modals for `IncomeSplitScreen` |
| `AccountPasswordModal` | `apps/web/src/app/dashboard/settings/components/AccountPasswordModal.tsx` | 64 | `ModalDialog` | Set initial password (OAuth-only) or change existing password |

### 4.2 Mobile Modals, Bottom Sheets & Confirm Dialogs (26 Components)

| Component / Dialog Name | File Path | Lines | Primitive Used | Notes / Status |
| :--- | :--- | ---: | :--- | :--- |
| `MobileCommandPaletteSheet` | `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` | 253 | `MobileModalDialog` | Shared in `@kaesava/ui/mobile` (globally mounted via `CommandPaletteProvider` + `AppScreenWrapper` header trigger; Smart Priority search + Ask Penny AI with `MobileCommandPaletteSections.tsx`) |
| `MobileEnvelopeDetailSheet` | `packages/ui/src/mobile/MobileEnvelopeDetailSheet.tsx` | 325 | `MobileModalDialog` | Shared envelope detail bottom sheet |
| `MobileFileNotesSheet` / `NotesFeedModal` | `packages/capabilities/file-notes/src/mobile/MobileFileNotesSheet.tsx` (369L) / `NotesFeedModal.tsx` (456L) | 369 / 456 | `MobileModalDialog`, `showMobileConfirm` | Shared capability bottom sheet for file notes |
| `QuickExpenseModal` | `apps/mobile/src/components/QuickExpenseModal.tsx` | 229 | `MobileModalDialog`, `showMobileConfirm` | 3-tab quick action sheet (`QuickExpenseTab`, `QuickIncomeTab`, `QuickTransferTab`) |
| `EnvelopeFormModal` | `apps/mobile/src/components/EnvelopeFormModal.tsx` | 388 | `MobileModalDialog`, `showMobileConfirm`, `CrossBankTransferModal` | Merged Create/Edit envelope & bill schedule sheet (`isEdit`), same-privacy bank re-linking |
| `IncomeExpenseFormModal` | `apps/mobile/src/components/IncomeExpenseFormModal.tsx` | 268 | `MobileModalDialog`, `MobileConfirmDialog` (x2) | Create/Edit income schedule or one-off event sheet (`isEdit`) |
| `BankAccountFormModal` | `apps/mobile/src/components/BankAccountFormModal.tsx` | 216 | `MobileModalDialog`, `showMobileConfirm` | Merged Create/Edit bank account sheet (`isEdit`) |
| `MobileReconciliationModal` | `apps/mobile/src/components/envelopes/MobileReconciliationModal.tsx` | 394 | `MobileModalDialog`, `showMobileConfirm` | Match Bank Balance sheet |
| `MarkPaidModal` | `apps/mobile/src/components/MarkPaidModal.tsx` | 255 | `MobileModalDialog` | Bill payment & shortfall cover sheet |
| `MobileTransferModal` | `apps/mobile/src/components/paychecks/MobileTransferModal.tsx` | 230 | `MobileModalDialog`, `MobileConfirmDialog` | Scheduled transfer confirmation sheet |
| `CrossBankTransferModal` | `apps/mobile/src/components/CrossBankTransferModal.tsx` | 188 | `MobileModalDialog` | Cross-bank transfer reminder modal |
| `EventOverrideModal` | `apps/mobile/src/components/EventOverrideModal.tsx` | 252 | `MobileModalDialog`, `showMobileConfirm` | Edit upcoming income/expense event occurrence |
| `MobileBurstModal` | `apps/mobile/src/components/paychecks/MobileBurstModal.tsx` | 243 | `MobileModalDialog`, `showMobileConfirm` | Schedule occurrence list & inline edit sheet |
| `MobileAccountPasswordModal` | `apps/mobile/src/components/settings/MobileAccountPasswordModal.tsx` | 73 | `MobileModalDialog` | Set initial password (OAuth-only) or change existing password |
| `MobilePaydayTransferModal` | `apps/mobile/src/components/paychecks/MobilePaydayTransferModal.tsx` | 168 | `MobileModalDialog` | Post-payday transfer checklist sheet |
| `MobilePaydayAllocationDetailModal` | `apps/mobile/src/components/paychecks/MobilePaydayAllocationDetailModal.tsx` | 114 | `MobileModalDialog` | Historical payday split breakdown sheet |
| `TransactionDetailSheet` | `apps/mobile/src/components/transactions/TransactionDetailSheet.tsx` | 194 | `MobileModalDialog` | Ledger transaction detail & inline note edit sheet |
| `LinkedPoolsModalSheet` | `apps/mobile/src/components/bank-accounts/LinkedPoolsModalSheet.tsx` | 166 | `MobileModalDialog` | Bank account linked envelopes breakdown sheet |
| `EnvelopesFilterSheet` | `apps/mobile/src/components/envelopes/EnvelopesFilterSheet.tsx` | 91 | `MobileFilterSheet` | Envelopes filter & sort bottom sheet |
| `MobileAffordCheckModal` | `apps/mobile/src/components/afford-check/MobileAffordCheckModal.tsx` | 289 | `MobileModalDialog` | Dashboard "Can I Afford It?" sheet |
| `FeedbackFormModal` | `apps/mobile/src/components/FeedbackFormModal.tsx` | 237 | `MobileModalDialog` | Bug report / feedback sheet (`trpc.submitFeedback`) |
| `MobilePlanPickerModal` | `apps/mobile/src/components/settings/MobilePlanPickerModal.tsx` | 315 | `MobileModalDialog` | Subscription plan picker & Stripe checkout sheet |
| `MobileTenantSwitcherModal` | `apps/mobile/src/components/settings/MobileTenantSwitcherModal.tsx` | 176 | `MobileModalDialog` | Household switcher & create household sheet |
| `MobilePaydaySandboxModal` | `apps/mobile/src/components/setup/MobilePaydaySandboxModal.tsx` | 213 | `MobileModalDialog` | Setup wizard payday simulation sheet |
| `EnvelopeOverflowMenuModal` | `apps/mobile/src/components/envelopes/EnvelopeOverflowMenuModal.tsx` | 122 | `MobileModalDialog` | Envelope action menu |
| `EnvelopeRowActionsSheet` | `apps/mobile/src/components/envelopes/EnvelopeRowActionsSheet.tsx` | 88 | `MobileModalDialog` | Per-envelope row action sheet (`Draw down`, `Mark as Target Envelope for Shortfall/Surplus`, `Edit`) |
| `MobileUnsavedPaydayPlanExitDialog` | `apps/mobile/src/components/plan/MobileUnsavedPaydayPlanExitDialog.tsx` | 39 | `MobileConfirmDialog` | Unsaved payday split exit dialog |

### 4.3 Tradie Matters & Ring 2 Web/Mobile Modals, Drawers & Bottom Sheets

| Component / Sheet | Platform & File Path | Primitive Used | Purpose |
| :--- | :--- | :--- | :--- |
| `CsvImportWizardModal` | Web (`apps/tradie-matters/web/src/components/CsvImportWizardModal.tsx`) | `ModalDialog` | Pricebook CSV upload, column mapping & import |
| `ChatThreadPanel` / `MobileChatThreadSheet` | Web & Mobile (`packages/capabilities/chat/src/{web,mobile}/`) | `SlideOverDrawer` / `MobileModalDialog` | Ring 2 crew chat thread with `@mention` push notifications |
| `CustomerFormModal`, `SiteFormModal` | Mobile (`apps/tradie-matters/mobile/src/components/customers/`) | `MobileModalDialog` | Create/Edit customer & service site with `MobileSmartAddressField` |
| `SmsThreadModal` | Mobile (`apps/tradie-matters/mobile/src/components/inbox/SmsThreadModal.tsx`) | `MobileModalDialog` | Two-way SMS/MMS thread drawer |
| `CreateJobModal`, `VariationCaptureSheet`, `MaterialQuickAddSheet`, `ReceiptSnapOcrSheet`, `JobPhotoCaptureSheet`, `JobCrewChatSheet` | Mobile (`apps/tradie-matters/mobile/src/components/jobs/`) | `MobileModalDialog` | Field job creation, variations, materials, receipt OCR snap, R2 photo capture, crew chat |
| `QuoteBuilderModal`, `PricebookPickerModal`, `QuoteSignAcceptModal` | Mobile (`apps/tradie-matters/mobile/src/components/quotes/`) | `MobileModalDialog` | Quote builder, pricebook picker, on-site customer `MobileSignaturePad` acceptance |
| `ConvertJobInvoiceSheet`, `MobileRecordPaymentSheet`, `MobileCreditNoteSheet`, `MobilePayIdShowCard` | Mobile (`apps/tradie-matters/mobile/src/components/invoices/`) | `MobileModalDialog` | Job-to-invoice conversion, payment recording, credit notes, PayID QR/details card |
| `PricebookItemModal` | Mobile (`apps/tradie-matters/mobile/src/components/pricebook/PricebookItemModal.tsx`) | `MobileModalDialog` | Create/Edit pricebook service or material item |

---

## 5. Screen-by-Screen Web vs. Mobile Parity Matrix

| Screen / Capability | Web Route & Primary File | Mobile Route & Primary File | tRPC Procedures Invoked | Tour Anchors (`data-tour` / `MOBILE_TOUR_STEPS`) | Intentional Platform Idioms & Open Parity Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Marketing, Legal & Early Access** | `/`, `/privacy`, `/terms`, `/blog` (`apps/web/src/app/page.tsx`) | In-app links from Auth/Settings (Mobile starts at `/(auth)/sign-in`) | `tenant.subscribeEarlyAccess`, `getAppConfig` | N/A | Web hosts full marketing site & interactive payday simulator; Mobile enters directly into authentication. |
| **Authentication, OTP Reset & Partner Invite** | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/invite/[token]` | `/(auth)/sign-in`, `/(auth)/sign-up`, `/(auth)/forgot-password`, `/(auth)/reset-password`, `/(auth)/invite/[token]` | `tenant.getInviteDetails`, `tenant.acceptInvite`, `tenant.getMyTenants` | N/A | Full functional parity (Email/Password, Google OAuth, 6-digit OTP reset, 48h partner invite). |
| **First-Run 5-Step Setup & 3-Step Rerun Wizard** | `/setup` (`?mode=rerun`) (`apps/web/src/app/setup/page.tsx`) | `/(setup)/income`, `bank-accounts`, `goals`, `lifestyle`, `envelopes` | `saveSetupBudget`, `completeSetup`, `cancelSetup`, `listIncomeSources`, `listEnvelopes` | N/A | Web uses single-page step state; Mobile uses Expo Router stack screens. 3-step rerun covers Income -> Goals -> Envelopes Review. |
| **Dashboard / Home Overview** | `/dashboard` (`apps/web/src/app/dashboard/page.tsx`) | `/(app)/home` (`apps/mobile/src/app/(app)/home.tsx`) | `getHomeSummary`, `listBankAccountsWithExpected`, `getSubscriptionStatus` | `envelopes-row`, `payday-card`, `afford-check`, `quick-actions`, `ask-penny` | Web uses top "+ Quick Action" dropdown + mobile-only `DashboardMobileFab` (`md:hidden`); Mobile uses bottom-right `QuickActionFab` with haptics. |
| **Bank Accounts & Balance Alignment** | `/dashboard/bank-accounts` (`apps/web/src/app/dashboard/bank-accounts/page.tsx`) | `/(app)/bank-accounts` (`apps/mobile/src/app/(app)/bank-accounts.tsx`) | `getBankAccountsWithMappings`, `createBankAccount`, `updateBankAccount`, `archiveBankAccount`, `syncBankBalance` | `bank-accounts` | Standalone screen on both Web and Mobile (moved out of Mobile Settings tabs). |
| **Envelopes List, Detail & 12M Projection** | `/dashboard/envelopes` (`?mode=projection`) | `/(app)/envelopes`, `/(app)/envelopes/[id]`, `/(app)/envelopes/projection` | `listEnvelopes`, `createEnvelope`, `updateEnvelope`, `setSurplusTarget`, `archiveEnvelope`, `getProjectedEnvelopeBalances` | `envelopes-row` | Web opens `EnvelopeDetailDrawer` + inline projection scrubber; Mobile pushes `/(app)/envelopes/[id]` and `/(app)/envelopes/projection`. Both expose per-row `...` `"Mark as Target Envelope for Shortfall/Surplus"` action. |
| **Plan: Upcoming Timeline, 12M Horizon & Schedules** | `/dashboard/plan` (`apps/web/src/app/dashboard/plan/page.tsx`) | `/(app)/plan`, `/(app)/plan/schedules`, `/(app)/payday-plan` | `getHorizonProjectionData`, `listIncomeEvents`, `listExpenseEvents`, `listTransferEvents`, `overrideEvent` | `upcoming-events`, `schedules-tab` | Web renders 3 tabs + `ScheduleBurstModal` + stealth header totals; Mobile splits into dedicated push screens + `MobileBurstModal`. |
| **Allocate Payday (Income Split Studio)** | `/dashboard/payday-plan` (`apps/web/src/app/dashboard/payday-plan/page.tsx`) | `/(app)/payday-plan/[id]` (`apps/mobile/src/app/(app)/payday-plan/[id].tsx`) | `previewPayday`, `saveBulkAllocations`, `saveAutoAllocation`, `confirmPayday`, `resetAllocationPlan` | `payday-card` | Both implement the Document Draft Model (`Auto-Calculated` -> `Custom Draft` -> `Save Draft` / `Confirm & Apply` + `Reset`) and inline transfer checklist modal. |
| **"Can I Afford It?" Purchase Simulator** | `/dashboard/afford-check` + `AffordCheckModal` | `/(app)/afford-check` + `MobileAffordCheckModal` | `canAfford` | `afford-check` | Full 6-verdict parity (`SAFE_YES`, `PACING_TIGHT`, `BILLS_RISK`, `WAIT_FOR_PAYCYCLE`, `GOAL_DELAYED`, `HARD_NO`), `startAdvice`, `billsDueItems`, `goalAlternative`, and `GoalDelayCard`. |
| **Activity / History (Transactions & Payday Plans)** | `/dashboard/history` (`apps/web/src/app/dashboard/history/page.tsx`) | `/(app)/history` (`apps/mobile/src/app/(app)/history.tsx`) | `listTransactions`, `recordExpense`, `moveMoney`, `markExpensePaid`, `listAllAllocationPlans` | `history-ledger` | Web downloads itemized CSV directly; Mobile shares identical itemized CSV via `expo-sharing`. |
| **Visual Analytics / Reports** | `/dashboard/reports` (`apps/web/src/app/dashboard/reports/page.tsx`) | `/(app)/reports` (`apps/mobile/src/app/(app)/reports.tsx`) | `getSpendingAnalytics`, `getPaydayPlanAnalytics`, `listEnvelopes`, `getBankAccountsWithMappings` | N/A | Guarded by `apps.featureFlags.reports` on both platforms, with SearchInputs on both Spending and Payday Plans tabs. |
| **Settings (Profile, Household, Archived, Account & Data)** | `/dashboard/settings` + `/allocation-rules`, `/notifications` | `/(app)/settings` + `/allocation-rules`, `/archived`, `/notifications` | `getUserPreferences`, `updateUserPreferences`, `getHouseholdGovernanceInfo`, `updateHousehold`, `getActiveAllocationStrategy`, `applyAllocationPreset`, `updateAllocationStrategySteps`, `getSubscriptionStatus`, `createCheckoutSession`, `verifyCheckoutSession`, `listArchivedItems`, `restoreItem`, `submitFeedback` | Settings Product Tour button & Version Footer on both | Exact 4 tabs on both platforms (`profile`, `household` incl. Recalibrate Plan, `archived`, `account-data`). Intentional mobile-native UX: inline `MobileSubscriptionModal` (with `session_id` -> `verifyCheckoutSession`), Sign-Out confirmation dialog, and Biometrics/Haptics toggles. |

### 5.2 Tradie Matters Screen-by-Screen Web vs. Mobile Parity Matrix

| Screen / Capability | Web Route | Mobile Route | Primary tRPC Routers | Platform Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Today / Cash Pulse Dashboard** | `/dashboard` | `/(app)/today` | `pulse`, `jobs`, `dispatch` | Weekly Payday Cash Readiness Pulse + Today's agenda (`MobileDailyAgendaList` on Mobile). |
| **Dispatch & Schedule** | `/dashboard/schedule` | `/(app)/today` (Agenda) | `dispatch`, `jobs` | Web renders `ResourceDayTimeline` / `ResourceWeekGrid` drag-and-drop; Mobile renders `MobileWeekStrip` + `MobileDailyAgendaList`. |
| **Inbox & Missed-Call Leads** | `/dashboard/inbox` | `/(app)/inbox` | `sms`, `jobs` | Inbound SMS/MMS, missed-call auto-text leads, credit balance. |
| **Jobs & Field Operations** | `/dashboard/jobs`, `/dashboard/jobs/[id]` | `/(app)/jobs`, `/(app)/jobs/[id]` | `jobs`, `field`, `chat`, `fileNotes`, `pulse` | Mobile includes offline outbox sync (`OfflineSyncBadge`), GPS check-in/out timer, receipt OCR snap, and On-My-Way SMS. |
| **Quotes & Public Portal** | `/dashboard/quotes`, `/dashboard/quotes/[id]`, `/q/[token]` | `/(app)/quotes`, `/(app)/quotes/[id]` | `quotes`, `portalQuote` | Good/Better/Best option groups, on-site signature capture (`MobileSignaturePad`), public portal `/q/[token]` (`SignaturePad`). |
| **Tax Invoices & Stripe Connect** | `/dashboard/invoices`, `/dashboard/invoices/[id]`, `/i/[token]` | `/(app)/invoices`, `/(app)/invoices/[id]` | `invoices`, `portalInvoice` | ATO GSTR 2013/1 compliance, credit notes, PayID show card, public portal `/i/[token]` with AU BECS / conditional card checkout. |
| **Customers & Sites CRM** | `/dashboard/customers` | `/(app)/customers`, `/(app)/customers/[id]` | `customers`, `sites`, `geo` | `SmartAddressField` / `MobileSmartAddressField` via `@kaesava/capability-geo`. |
| **Pricebook** | `/dashboard/pricebook` | `/(app)/pricebook` | `pricebook` | Starter packs + fuzzy search on both; CSV import wizard on Web. |
| **Timesheets & Activity** | `/dashboard/timesheets`, `/dashboard/activity` | `/(app)/timesheets`, `/(app)/activity` | `timesheets`, `activity` | Shared `ActivityHistoryTable` (Web) and `MobileActivityHistoryList` + `MobileActivityDetailSheet` (Mobile). |
| **Suppliers & Accounting** | `/dashboard/suppliers`, `/dashboard/settings` | `/(app)/settings` | `suppliers`, `accounting`, `business`, `tenant`, `billing`, `notifications` | Supplier bills/POs & Xero/MYOB/QBO connection settings. |

---

## 6. `@kaesava/ui` Shared Primitives & Entrypoints Inventory

### 6.1 Package Entrypoints (`packages/ui/package.json`)
- `@kaesava/ui` (`.`) → `packages/ui/src/index.ts` (re-exports `DESIGN_TOKENS`, shared hooks/formatters/dates, and `./web/index`).
- `@kaesava/ui/web` (`./web`) → `packages/ui/src/web/index.ts` (exported symbols across modals, drawers, form inputs, tables, `PlatformSettingsShell`, `AppThemeProvider`, charts, `AbnInput`, `WorkspaceDesktopSidebar`, `WorkspaceMobileHeader`, `WorkspaceMobileDrawer`, `ActivityHistoryTable`, `DetailDrawer`, `ContactLinks`, `GenericListView`, `SignaturePad`, and providers).
- `@kaesava/ui/mobile` (`./mobile`) → `packages/ui/src/mobile/index.ts` (exported symbols across native bottom-sheet modals (Android-tuned via `PLATFORM_STYLE`), `MobileLinkButton`, `MobileDetailLinkRow`, `AppThemeProvider`, `useKeyboardInset`, native `DatePickerField`, bottom-sheet `InfoTooltip`, inputs, pickers, charts, `MobileAbnInput`, `OfflineSyncBadge`, `MobileWorkspaceScreenShell`, `MobileActivityHistoryList`, `MobileActivityDetailSheet`, `exportCsvFile`, `MobileDetailSheet`, `ContactLinks`, `MobileSignaturePad`, and providers).
- `@kaesava/ui/tokens` (`./tokens`) → `packages/ui/src/tokens.ts` (`DESIGN_TOKENS`).
- `@kaesava/ui/styles.css` (`./styles.css`) → `packages/ui/src/styles.css` (Serene Finance CSS tokens & base utilities).

---

### Tradie Matters Routes & Primitives
- **Web Routes Added:** `/review/[token]` (public customer satisfaction & Google Review booster); `/dashboard/settings/notifications` consolidated into `PlatformSettingsShell` Settings tab.
- **Mobile Routes Added:** `/(app)/schedule`, `/(app)/suppliers`, `/(app)/subscription`, plus `MoreMenuModal` role/flag-gated navigation hub.

## 7. `@kaesava/i18n` Dictionary Files & Namespace Inventory (`2,047` Leaf Keys)

All user-facing copy lives in `packages/i18n/src/dictionaries/en/*.ts` (re-exported via `packages/i18n/src/dictionaries/en.ts`).

| Dictionary File (`packages/i18n/src/dictionaries/en/*.ts`) | Top-Level Namespaces Owned | Total Keys | Web `t()` Calls (Distinct Keys) | Mobile `t()` Calls (Distinct Keys) | API `t()` Calls (Distinct Keys) | Packages `t()` Calls (Distinct Keys) |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| `auth.ts` | `auth`, `tenantSwitcher`, `partner` | 83 | 133 (74) | 132 (76) | 0 (0) | 1 (1) |
| `commandPalette.ts` | `commandPalette` | 26 | 4 (2) | 0 (0) | 0 (0) | 40 (21) |
| `common.ts` | `common`, `nav`, `actions`, `badges`, `tables`, `forms`, `toasts`, `tooltips`, `validation`, `notFound`, `networkError`, `keyboardShortcuts`, `errors`, `legal`, `location`, `app`, `searchSelect` | 207 | 302 (136) | 307 (98) | 0 (0) | 133 (79) |
| `dashboard.ts` | `dashboard`, `home`, `cards`, `assistant` | 130 | 83 (71) | 96 (78) | 0 (9) | 18 (19) |
| `envelopes.ts` | `envelopes`, `categories`, `categoryDrawer`, `drawers`, `modals`, `poolTypes`, `quickPick`, `goalModes` | 309 | 290 (201) | 271 (177) | 0 (0) | 82 (42) |
| `feedback.ts` | `feedback` | 26 | 25 (25) | 25 (25) | 0 (0) | 0 (0) |
| `fileNotes.ts` | `fileNotes` | 16 | 2 (2) | 2 (1) | 0 (0) | 27 (16) |
| `plan.ts` | `planTabs`, `incomeAndBills`, `schedules`, `matrix`, `billCoverage`, `expenseStatus` | 130 | 75 (66) | 100 (81) | 0 (0) | 11 (16) |
| `landing.ts` | `landing` | 292 | 230 (192) | 5 (3) | 0 (0) | 0 (0) |
| `payday.ts` | `payday`, `paydayDrawer`, `paychecks` | 99 | 86 (75) | 103 (79) | 0 (0) | 14 (8) |
| `privacy.ts` | `privacy`, `terms`, `public` | 143 | 136 (135) | 22 (21) | 0 (5) | 4 (4) |
| `reports.ts` | `reports` | 17 | 12 (9) | 8 (8) | 0 (0) | 0 (0) |
| `settings.ts` + `settings-sections.ts` | `settings`, `subscription`, `notifications`, `bankAccounts` | 383 | 341 (281) | 294 (247) | 4 (3) | 16 (22) |
| `setup.ts` | `setup` | 175 | 177 (151) | 169 (153) | 0 (0) | 5 (9) |
| `tour.ts` | `tour` | 38 | 7 (33) | 7 (33) | 0 (0) | 12 (5) |
| `history.ts` | `transactions`, `canIAfford` | 177 | 133 (101) | 101 (84) | 0 (0) | 78 (43) |
| **Total** | **47 Top-Level Namespaces across 16 Files** | **2,247** | **2,036 (1,554)** | **1,642 (1,165)** | **4 (17)** | **441 (245)** |

### 7.2 Ring 2 & Ring 3 Capability i18n Namespaces (`packages/capabilities/*/src/i18n/*.ts` & `apps/tradie-matters/mobile/src/i18n/`)

- **Ring 2 Capabilities:** `geo` (`packages/capabilities/geo/src/i18n/geo.ts`), `calendar` (`packages/capabilities/calendar/src/i18n/calendar.ts`), `chat` (`packages/capabilities/chat/src/i18n/chat.ts`).
- **Ring 3 Money Matters (`@money-matters/capability-budgeting`):** `dashboard`, `envelopes`, `history`, `landing`, `payday`, `plan`, `reports`, `setup` (`packages/capabilities/budgeting/src/i18n/`).
- **Ring 3 Tradie Matters (`@tradie-matters/capability-operations`, `@tradie-matters/capability-integrations`, Mobile):** `tradieCrm`, `tradieInvoices`, `tradieJobs`, `tradiePulse`, `tradieQuotes`, `tradieSetup` (`packages/capabilities/tradie-operations/src/i18n/`), `tradieSms`, `tradieSync` (`packages/capabilities/tradie-integrations/src/i18n/`), `tradieMobile` (`apps/tradie-matters/mobile/src/i18n/tradieMobile.ts`).
