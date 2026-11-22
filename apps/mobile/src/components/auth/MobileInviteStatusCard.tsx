import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { authClient } from '../../lib/auth';
import { setActiveTenantId } from '../../lib/trpc-session';

interface MobileInviteStatusCardProps {
  variant: 'loading' | 'success' | 'expired' | 'already_accepted' | 'invalid' | 'error';
  errorMsg?: string;
  activeEmail?: string | null;
  onSignedOut?: () => void;
}

export function MobileInviteStatusCard({
  variant,
  errorMsg = '',
  activeEmail,
  onSignedOut,
}: MobileInviteStatusCardProps) {
  const router = useRouter();

  if (variant === 'loading') {
    return (
      <View style={styles.stateWrapper}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.primary} />
        <Text style={styles.title}>{t('memberInvite.acceptTitle')}</Text>
        <Text style={styles.subtitle}>{t('memberInvite.acceptSubtitle')}</Text>
      </View>
    );
  }

  if (variant === 'success') {
    return (
      <View style={styles.stateWrapper}>
        <View style={styles.successIconBadge}>
          <Feather name="check" size={28} color={DESIGN_TOKENS.colors.onPrimary} />
        </View>
        <Text style={styles.title}>{t('memberInvite.acceptSuccessTitle')}</Text>
        <Text style={styles.subtitle}>{t('memberInvite.acceptSuccessMessage')}</Text>
      </View>
    );
  }

  const isEmailMismatch =
    variant === 'error' &&
    (errorMsg.toLowerCase().includes('does not match') ||
      errorMsg.toLowerCase().includes('switch accounts'));

  const message =
    variant === 'expired'
      ? t('memberInvite.inviteExpiredError')
      : variant === 'already_accepted'
        ? t('memberInvite.inviteAlreadyAccepted')
        : variant === 'invalid'
          ? t('memberInvite.invalidToken')
          : isEmailMismatch
            ? t('memberInvite.wrongAccountPrivacyHint')
            : errorMsg || t('memberInvite.invalidToken');

  return (
    <View style={styles.stateWrapper}>
      <View style={styles.errorIconBadge}>
        <Feather name="alert-triangle" size={28} color={DESIGN_TOKENS.colors.onPrimary} />
      </View>
      <Text style={styles.title}>
        {isEmailMismatch ? t('memberInvite.wrongAccountTitle') : t('memberInvite.acceptErrorTitle')}
      </Text>
      {isEmailMismatch && activeEmail && (
        <Text style={styles.activeEmailBadge}>
          {t('memberInvite.signedInAsNote', { email: activeEmail })}
        </Text>
      )}
      <Text style={styles.subtitle}>{message}</Text>
      {isEmailMismatch && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={async () => {
            await authClient.signOut();
            await setActiveTenantId(null);
            onSignedOut?.();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>{t('memberInvite.signOutAndContinue')}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.replace((activeEmail ? '/(app)/home' : '/(auth)/sign-in') as Href)}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryBtnText}>
          {activeEmail ? t('memberInvite.goToDashboard') : t('auth.signIn')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrapper: { alignItems: 'center', gap: 12, width: '100%' },
  successIconBadge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: DESIGN_TOKENS.colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  errorIconBadge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: DESIGN_TOKENS.colors.critical,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  activeEmailBadge: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.warning, textAlign: 'center' },
  actionBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary, paddingHorizontal: 24, height: 44,
    borderRadius: DESIGN_TOKENS.radius.default, alignItems: 'center', justifyContent: 'center', marginTop: 8, width: '100%',
  },
  actionBtnText: { color: DESIGN_TOKENS.colors.onPrimary, fontSize: 14, fontWeight: '600' },
  secondaryBtn: { paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: DESIGN_TOKENS.colors.textMuted, fontSize: 13, fontWeight: '600' },
});
