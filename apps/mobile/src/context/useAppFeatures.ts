import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';
import { DEFAULT_APP_FEATURE_FLAGS } from '@kaesava/types';

export function useAppFeatures() {
  const { data: session } = authClient.useSession();
  const query = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const features = query.data?.features ?? DEFAULT_APP_FEATURE_FLAGS;
  const rawFeatures = features as unknown as Record<string, unknown>;
  const appFlags = (rawFeatures.appFlags as Record<string, unknown> | undefined) ?? rawFeatures;

  return {
    hasAiAssistant: Boolean(features.aiAssistant),
    hasPrivateMode: Boolean(features.privateMode),
    hasPartnerInvites: Boolean(features.privateMode),
    hasFileNotes: Boolean(features.fileNotes),
    hasSimulation: Boolean(appFlags.simulation ?? rawFeatures.simulation ?? true),
    hasCustomAllocationRules: Boolean(appFlags.customAllocationRules ?? rawFeatures.customAllocationRules ?? true),
    hasReports: Boolean(appFlags.reports ?? rawFeatures.reports ?? true),
    features,
    isLoading: query.isLoading,
  };
}
