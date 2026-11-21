import { DEFAULT_TIMEZONE } from "@money-matters/types";
import { useState, useMemo } from "react";
import { Platform } from "react-native";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { t } from "@money-matters/i18n";
import { SignUpInputSchema, isValidEmail, getCountryDefaults, detectBestGuessCountry } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";

export function useSignUpForm() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const isInviteFlow = typeof redirect === "string" && redirect.startsWith("/invite/");

  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  }, []);

  const detectedCountry = useMemo(() => {
    try {
      const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || "";
      return detectBestGuessCountry(deviceLocale, detectedTimezone);
    } catch {
      return "AU";
    }
  }, [detectedTimezone]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(() => detectedCountry);
  const [currency, setCurrency] = useState(() => getCountryDefaults(detectedCountry).currency);
  const [timezone, setTimezone] = useState(() => detectedTimezone);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const defaults = getCountryDefaults(newCountry);
    setCurrency(defaults.currency);
    setTimezone(defaults.timezone);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev }));
  };

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);

  const createTenant = trpc.createTenant.useMutation();
  const registerToken = trpc.registerToken.useMutation();

  const handleSignUp = async () => {
    setError(null);
    setFieldErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    const validation = SignUpInputSchema.safeParse({
      name: name.trim(),
      email: normalizedEmail,
      password,
      confirmPassword,
      country,
      agreedToTerms: agreeTerms,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0] ? t("auth.fillAllFields") : undefined,
        email: formatted.email?._errors[0] === "invalidEmail" ? t("validation.invalidEmail") : t("auth.fillAllFields"),
        password: formatted.password?._errors[0] ? t("auth.passwordTooShort") : undefined,
        confirmPassword: formatted.confirmPassword?._errors[0]
          ? (formatted.confirmPassword._errors[0] === "passwordsMustMatch" ? t("auth.passwordsMustMatch") : t("auth.passwordTooShort"))
          : undefined,
        agreeTerms: formatted.agreedToTerms?._errors[0] ? t("auth.mustAgreeToTerms") : undefined,
      });
      return;
    }

    setLoading(true);
    try {

      const signUpResult = await authClient.signUp.email({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      if (signUpResult.error) {
        const msg = signUpResult.error.message || "";
        const errCode = (signUpResult.error as { code?: string }).code || "";
        const isExistingUser =
          errCode === "USER_ALREADY_EXISTS" ||
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exist");
        if (isExistingUser) {
          setError(t("auth.userAlreadyExists"));
          setLoading(false);
          router.replace({
            pathname: "/(auth)/sign-in",
            params: { email: normalizedEmail, reason: "existing" },
          });
          return;
        }
        setError(msg || t("auth.signUpErrorGeneric"));
        setLoading(false);
        return;
      }

      setPasswordForOtp(password);
      setUnverifiedEmail(normalizedEmail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.signUpErrorGeneric");
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  const handleOtpSuccess = async () => {
    try {
      setLoading(true);
      const session = await authClient.getSession();
      if (session?.data?.session?.token) {
        setActiveSessionToken(session.data.session.token);
        await SecureStore.setItemAsync("auth_session_token", session.data.session.token);
      }
      if (session?.data?.user) {
        if (!isInviteFlow) {
          try {
            await createTenant.mutateAsync({
              name: `${name.trim()}'s Household`,
              country: country || "AU",
              currency,
              timezone,
            });
          } catch {
            // Household provisioning fallback
          }
        }
        try {
          const pushToken = await registerPushNotificationsAsync();
          const platform = Platform.OS === "ios" ? "ios" : "android";
          if (pushToken) await registerToken.mutateAsync({ token: pushToken, platform });
        } catch {
          // Push registration fallback
        }
      }
      if (isInviteFlow && redirect) {
        const token = redirect.replace("/invite/", "");
        router.replace(`/(auth)/invite/${token}` as Href);
        return;
      }
      router.replace("/(setup)/income");
    } catch {
      router.replace("/(setup)/income");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    name.trim().length >= 2 &&
    country.length === 2 &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword &&
    agreeTerms;

  return {
    name,
    setName,
    email,
    setEmail,
    country,
    setCountry,
    handleCountryChange,
    currency,
    setCurrency,
    timezone,
    setTimezone,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    agreeTerms,
    setAgreeTerms,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    loading,
    unverifiedEmail,
    setUnverifiedEmail,
    passwordForOtp,
    handleSignUp,
    handleOtpSuccess,
    isFormValid,
    isInviteFlow,
  };
}
