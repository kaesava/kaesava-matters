import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileButton, MobileInput, FormLabel, FormErrorBanner } from '@money-matters/ui/mobile';
import { InviteAccountStatus, InviteSignUpInputSchema } from '@money-matters/types';
import { authClient } from '../../lib/auth';
import { MobileSocialAuthButtons } from './MobileSocialAuthButtons';
import { MobileOtpVerificationView } from './MobileOtpVerificationView';
import { SignUpTermsCheckbox } from './SignUpTermsCheckbox';

interface MobileInviteAuthCardProps {
  token: string;
  inviteEmail: string;
  householdName: string;
  accountStatus: InviteAccountStatus;
  onAuthenticated: () => void;
}

export function MobileInviteAuthCard({
  token,
  inviteEmail,
  householdName,
  accountStatus,
  onAuthenticated,
}: MobileInviteAuthCardProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needOtpPassword, setNeedOtpPassword] = useState<string | null>(null);

  if (needOtpPassword !== null) {
    return (
      <MobileOtpVerificationView
        email={inviteEmail}
        password={needOtpPassword}
        onSuccess={onAuthenticated}
        onCancel={() => setNeedOtpPassword(null)}
      />
    );
  }

  const handleNewUserSubmit = async () => {
    setError(null);
    const parsed = InviteSignUpInputSchema.safeParse({
      name: name.trim(),
      password,
      confirmPassword,
      agreedToTerms: agreeTerms,
    });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message;
      setError(
        code === 'passwordTooShort'
          ? t('auth.passwordTooShort')
          : code === 'passwordsMustMatch'
            ? t('auth.passwordsMustMatch')
            : code === 'mustAgreeToTerms'
              ? t('auth.mustAgreeToTerms')
              : t('auth.fillAllFields')
      );
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.signUp.email({ email: inviteEmail, password, name: name.trim() });
      if (res.error) {
        setError(res.error.message || t('auth.signUpErrorGeneric'));
        setLoading(false);
        return;
      }
      const session = await authClient.getSession();
      if (session.data?.session) onAuthenticated();
      else setNeedOtpPassword(password);
    } catch {
      setError(t('auth.unexpectedError'));
      setLoading(false);
    }
  };

  const handleExistingUserSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email: inviteEmail, password });
      if (res.error) {
        setError(t('auth.signInFailed'));
        setLoading(false);
        return;
      }
      onAuthenticated();
    } catch {
      setError(t('auth.unexpectedError'));
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t('memberInvite.joinHouseholdTitle')}</Text>
      <Text style={styles.subtitle}>
        {householdName
          ? t('memberInvite.joinHouseholdNamedSubtitle', { householdName })
          : t('memberInvite.joinHouseholdSubtitle')}
      </Text>

      <View style={styles.field}>
        <FormLabel>{t('memberInvite.invitedEmailLabel')}</FormLabel>
        <MobileInput value={inviteEmail} editable={false} style={styles.readOnlyInput} />
      </View>

      <FormErrorBanner message={error} />
      <MobileSocialAuthButtons
        mode={accountStatus === 'NEW' ? 'signUp' : 'signIn'}
        redirectUrl={`/invite/${token}`}
        onError={(msg) => setError(msg)}
      />

      {accountStatus === 'GOOGLE_ONLY' ? (
        <Text style={styles.subtitle}>{t('memberInvite.googleOnlyInviteNote')}</Text>
      ) : (
        <View style={styles.form}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or').toUpperCase()}</Text>
            <View style={styles.dividerLine} />
          </View>
          {accountStatus === 'NEW' && (
            <MobileInput
              label={t('auth.nameLabel')}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.namePlaceholder')}
            />
          )}
          <MobileInput
            label={t('auth.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('auth.passwordPlaceholder')}
          />
          {accountStatus === 'NEW' && (
            <>
              <MobileInput
                label={t('auth.confirmPasswordLabel')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
              <SignUpTermsCheckbox
                agreeTerms={agreeTerms}
                setAgreeTerms={setAgreeTerms}
                onClearError={() => setError(null)}
              />
            </>
          )}
          <MobileButton
            onPress={accountStatus === 'NEW' ? handleNewUserSubmit : handleExistingUserSubmit}
            loading={loading}
            disabled={loading || (accountStatus === 'NEW' ? !agreeTerms || password.length < 8 : password.length === 0)}
            variant="primary"
          >
            {accountStatus === 'NEW' ? t('memberInvite.continueWithPassword') : t('memberInvite.signInAndJoin')}
          </MobileButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  field: { width: '100%' },
  readOnlyInput: { backgroundColor: DESIGN_TOKENS.colors.slate[100], color: DESIGN_TOKENS.colors.textMuted },
  form: { width: '100%', gap: 10 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: DESIGN_TOKENS.colors.border },
  dividerText: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted },
});
