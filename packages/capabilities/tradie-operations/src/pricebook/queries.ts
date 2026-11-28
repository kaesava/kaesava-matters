import { and, desc, eq, isNull } from "drizzle-orm";
import { tmPricebookItems, type DbOrTx } from "@kaesava/db/rings/tradie-matters";

export interface FuzzySearchOptions {
  query: string;
  itemType?: string;
  favouritesOnly?: boolean;
  limit?: number;
}

function isTokenMatch(haystack: string, token: string): boolean {
  if (haystack.includes(token)) return true;
  if (token.length < 3) return false;
  let pos = 0;
  for (const ch of token) {
    pos = haystack.indexOf(ch, pos);
    if (pos === -1) return false;
    pos += 1;
  }
  return true;
}

function scoreItem(
  item: typeof tmPricebookItems.$inferSelect,
  tokens: string[]
): number {
  const haystack = [
    item.name,
    item.sku ?? "",
    item.searchAliases ?? "",
    item.category ?? "",
    item.description ?? "",
    item.supplierName ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (tokens.length > 0 && !tokens.every((t) => isTokenMatch(haystack, t))) {
    return -1;
  }
  let score = item.isFavourite ? 50 : 0;
  for (const t of tokens) {
    if (item.name.toLowerCase().includes(t)) score += 20;
    else if ((item.sku ?? "").toLowerCase().includes(t)) score += 15;
    else if ((item.searchAliases ?? "").toLowerCase().includes(t)) score += 10;
    else score += 5;
  }
  return score;
}

export async function listPricebookItemsQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  limit = 100
) {
  return db
    .select()
    .from(tmPricebookItems)
    .where(
      and(
        eq(tmPricebookItems.tenantId, tenantId),
        eq(tmPricebookItems.appId, appId),
        isNull(tmPricebookItems.archivedAt)
      )
    )
    .orderBy(desc(tmPricebookItems.isFavourite), tmPricebookItems.name)
    .limit(limit);
}

export async function fuzzySearchPricebookQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  options: FuzzySearchOptions
) {
  const rows = await db
    .select()
    .from(tmPricebookItems)
    .where(
      and(
        eq(tmPricebookItems.tenantId, tenantId),
        eq(tmPricebookItems.appId, appId),
        isNull(tmPricebookItems.archivedAt),
        options.itemType ? eq(tmPricebookItems.itemType, options.itemType) : undefined,
        options.favouritesOnly ? eq(tmPricebookItems.isFavourite, true) : undefined
      )
    );

  const tokens = options.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return rows
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, options.limit ?? 25)
    .map((entry) => entry.item);
}
