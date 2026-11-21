import { isFeatureEnabled } from "@money-matters/config";
import type { UsageStorePort } from "../ports/index.js";

export interface GenericAssistantRunOptions<TResult> {
  appId: string;
  tenantId: string;
  isGracePeriod?: boolean;
  isExpired?: boolean;
  usageStore: UsageStorePort;
  tryDeterministic: () => Promise<TResult | null>;
  executeLlm: () => Promise<{ ok: boolean; result: TResult }>;
  onUnavailable: (reason: "disabled" | "subscription_required" | "read_only_grace" | "quota_exceeded" | "service_error") => TResult;
}

/**
 * App-agnostic AI Assistant orchestrator handling feature flag gating,
 * subscription/grace checks, deterministic short-circuit, atomic quota metering,
 * and automatic quota refund on LLM gateway/infrastructure failures.
 */
export async function runQuotaGuardedAssistant<TResult>(
  opts: GenericAssistantRunOptions<TResult>
): Promise<TResult> {
  if (!isFeatureEnabled("aiAssistant", opts.appId)) {
    return opts.onUnavailable("disabled");
  }
  if (opts.isExpired) {
    return opts.onUnavailable("subscription_required");
  }

  const deterministicResult = await opts.tryDeterministic();
  if (deterministicResult !== null) {
    return deterministicResult;
  }

  if (opts.isGracePeriod) {
    return opts.onUnavailable("read_only_grace");
  }

  const usage = await opts.usageStore.getUsage(opts.tenantId);
  if (usage.remaining <= 0) {
    return opts.onUnavailable("quota_exceeded");
  }

  const allowed = await opts.usageStore.incrementLlmCalls(opts.tenantId, usage.limit);
  if (!allowed) {
    return opts.onUnavailable("quota_exceeded");
  }

  try {
    const outcome = await opts.executeLlm();
    if (!outcome.ok) {
      await opts.usageStore.decrementLlmCalls?.(opts.tenantId);
      return opts.onUnavailable("service_error");
    }
    return outcome.result;
  } catch (err) {
    await opts.usageStore.decrementLlmCalls?.(opts.tenantId);
    throw err;
  }
}
