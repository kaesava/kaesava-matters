import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESIGN_TOKENS, MobileLogo } from '@money-matters/ui/mobile';
import { trpc, setActiveSessionToken } from '../../../lib/trpc';
import { setActiveTenantId } from '../../../lib/trpc-session';
import { authClient } from '../../../lib/auth';
import { MobileInviteStatusCard } from '../../../components/auth/MobileInviteStatusCard';
import { MobileInviteAuthCard } from '../../../components/auth/MobileInviteAuthCard';

export default function AcceptInviteMobileScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = authClient.useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const hasTriggeredRef = useRef(false);

  const inviteQuery = trpc.getInviteDetails.useQuery(
    { inviteToken: token || '' },
    { enabled: Boolean(token) && !isSessionPending && !session?.user, retry: false }
  );

  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: async (data) => {
      if (data?.tenantId) await setActiveTenantId(data.tenantId);
      setStatus('success');
      setTimeout(() => router.replace('/(app)/home' as Href), 2000);
    },
    onError: (err) => {
      setStatus('error');
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    if (isSessionPending || !token || !session?.user || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setStatus('loading');
    acceptInviteMutation.mutate({ inviteToken: token });
  }, [token, isSessionPending, session?.user, acceptInviteMutation]);

  const handleAuthenticated = async () => {
    const res = await authClient.getSession();
    if (res.data?.session?.token) setActiveSessionToken(res.data.session.token);
    await refetchSession();
    if (token) {
      hasTriggeredRef.current = true;
      setStatus('loading');
      acceptInviteMutation.mutate({ inviteToken: token });
    }
  };

  const handleSignedOut = async () => {
    hasTriggeredRef.current = false;
    setStatus('loading');
    setErrorMsg('');
    await refetchSession();
    await inviteQuery.refetch();
  };

  const renderCardContent = () => {
    if (!token) return <MobileInviteStatusCard variant="invalid" />;
    if (isSessionPending) return <MobileInviteStatusCard variant="loading" />;
    if (session?.user) {
      if (status === 'success') return <MobileInviteStatusCard variant="success" />;
      if (status === 'error') {
        return (
          <MobileInviteStatusCard
            variant="error"
            errorMsg={errorMsg}
            activeEmail={session.user.email}
            onSignedOut={handleSignedOut}
          />
        );
      }
      return <MobileInviteStatusCard variant="loading" />;
    }
    if (inviteQuery.isLoading || !inviteQuery.data) return <MobileInviteStatusCard variant="loading" />;
    const details = inviteQuery.data;
    if (details.status === 'EXPIRED') return <MobileInviteStatusCard variant="expired" />;
    if (details.status === 'ALREADY_ACCEPTED') return <MobileInviteStatusCard variant="already_accepted" />;
    if (details.status !== 'VALID' || details.emailMismatch || !details.inviteEmail) {
      return <MobileInviteStatusCard variant="invalid" />;
    }

    return (
      <MobileInviteAuthCard
        token={token}
        inviteEmail={details.inviteEmail}
        householdName={details.householdName ?? ''}
        accountStatus={details.accountStatus ?? 'NEW'}
        onAuthenticated={handleAuthenticated}
      />
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoWrap}>
        <MobileLogo size={48} source={require('../../../../assets/icon.png')} />
      </View>
      <View style={styles.card}>{renderCardContent()}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    justifyContent: 'center',
    padding: DESIGN_TOKENS.spacing.containerMargin,
  },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding * 1.5,
    alignItems: 'center',
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
