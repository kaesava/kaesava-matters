/**
 * Inversion-of-control platform contracts enabling app-agnostic vertical slices
 * (tenant, bank-accounts, file-notes, archive) without cross-capability DB imports.
 */

export interface TenantLifecycleContext<TDb = unknown> {
  db: TDb;
  tenantId: string;
  appId: string;
  userId: string;
  userEmail?: string;
}

/**
 * Composable contributor interface for full tenant data export (ZIP).
 * Each enabled Ring 2 capability and Ring 3 app implements this contract
 * to append its own CSV files without coupling to capability-tenant.
 */
export interface DataExportContributor<TDb = unknown> {
  id: string;
  exportCsvFiles: (params: {
    db: TDb;
    tenantId: string;
    userId: string;
    appId: string;
  }) => Promise<Record<string, string>>;
}

export interface TenantLifecycleHooks<TDb = unknown> {
  onTenantCreated?: (ctx: TenantLifecycleContext<TDb>) => Promise<void>;
  onSetupCancelled?: (ctx: TenantLifecycleContext<TDb>) => Promise<void>;
  onEnrichTenantDetails?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
  }) => Promise<Record<string, unknown>>;
  onMemberJoined?: (ctx: TenantLifecycleContext<TDb>) => Promise<void>;
  onMemberRemoved?: (
    ctx: TenantLifecycleContext<TDb> & { removedUserId: string }
  ) => Promise<void>;
  onMemberLeft?: (ctx: TenantLifecycleContext<TDb>) => Promise<void>;
  onTenantDeleting?: (
    ctx: TenantLifecycleContext<TDb>
  ) => Promise<{ fileKeysToDelete?: string[] } | void>;
  onExportTenantData?: (
    ctx: TenantLifecycleContext<TDb>
  ) => Promise<Record<string, string>>;
}

export interface BankAccountExpectedBalanceSummary {
  expectedBalance: string;
  linkedPoolCount: number;
  linkedEnvelopeCount: number;
}

export interface BankBalanceSyncSplit {
  envelopeId?: string;
  poolId?: string;
  adjustment: string;
}

export interface BankAccountLifecycleHooks<TDb = unknown> {
  onBankAccountsListed?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId?: string;
  }) => Promise<
    Array<{
      id: string;
      bankAccountId: string | null;
      envelopeType: string;
      [key: string]: unknown;
    }>
  >;
  onPrivateBankAccountCreated?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId: string;
    bankAccountId: string;
  }) => Promise<void>;
  validateBeforeArchive?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId: string;
    accountId: string;
    isPrivate: boolean;
  }) => Promise<void>;
  onBankAccountArchived?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId: string;
    accountId: string;
    isPrivate: boolean;
    archiveTimestamp: Date;
  }) => Promise<void>;
  onComputeExpectedBalances?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId: string;
    accounts: Array<{ id: string; unbudgetedBuffer: string | null }>;
  }) => Promise<Record<string, BankAccountExpectedBalanceSummary>>;
  onBankBalanceSynced?: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId: string;
    accountId: string;
    clientIdempotencyToken: string;
    note?: string;
    splits: BankBalanceSyncSplit[];
  }) => Promise<void>;
}

export interface EntityPrivacyResolution {
  exists: boolean;
  isPrivate: boolean;
  ownerUserId: string | null;
}

export type EntityPrivacyResolver<TDb = unknown> = (
  db: TDb,
  ctx: { tenantId: string; userId: string; appId: string },
  entityId: string
) => Promise<EntityPrivacyResolution>;

export type EntityPrivacyResolverMap<TDb = unknown> = Record<
  string,
  EntityPrivacyResolver<TDb>
>;

export interface ArchivableItemSummary {
  id: string;
  name: string;
  itemType: string;
  subtitle: string | null;
  archivedAt: Date | null;
}

export interface ArchivableEntityAdapter<TDb = unknown> {
  itemType: string;
  listArchived: (ctx: {
    db: TDb;
    tenantId: string;
    appId: string;
    userId?: string;
  }) => Promise<ArchivableItemSummary[]>;
  restoreItem: (ctx: {
    db: TDb;
    itemId: string;
    tenantId: string;
    appId: string;
    userId: string;
  }) => Promise<unknown>;
}
