import { useState, useMemo, useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { t } from "@money-matters/i18n";
import {
  CompleteProfileInputSchema,
  DEFAULT_TIMEZONE,
  detectBestGuessCountry,
  getCountryDefaults,
} from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveTenantId, switchActiveTenant } from "../../lib/trpc";

export function useCompleteProfile() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session, isPending } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
  });
  const createTenant = trpc.createTenant.useMutation();

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
  const [country, setCountry] = useState(() => detectedCountry);
  const [currency, setCurrency] = useState(() => getCountryDefaults(detectedCountry).currency);
  const [timezone, setTimezone] = useState(() => detectedTimezone);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; agreeTerms?: string }>({});

  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session?.user?.name, name]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/(auth)/sign-in" as Href);
      return;
    }
    if (tenantStatusQuery.data?.hasTenant) {
      router.replace(
        (tenantStatusQuery.data.setupCompleted ? "/(app)/home" : "/(setup)/income") as Href
      );
    }
  }, [isPending, session?.user, tenantStatusQuery.data, router]);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const defaults = getCountryDefaults(newCountry);
    setCurrency(defaults.currency);
    setTimezone(defaults.timezone);
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    const validation = CompleteProfileInputSchema.safeParse({
      name: name.trim(),
      country,
      agreedToTerms: agreeTerms,
    });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0] ? t("auth.fillAllFields") : undefined,
        agreeTerms: formatted.agreedToTerms?._errors[0] ? t("auth.mustAgreeToTerms") : undefined,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await createTenant.mutateAsync({
        name: `${name.trim()}'s Household`,
        country,
        currency,
        timezone,
      });
      if (res.tenantId) {
        setActiveTenantId(res.tenantId);
        await switchActiveTenant(res.tenantId, utils);
      }
      await utils.getTenantStatus.invalidate();
      router.replace("/(setup)/income" as Href);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim().length >= 2 && country.length === 2 && agreeTerms;

  return {
    name,
    setName,
    country,
    handleCountryChange,
    agreeTerms,
    setAgreeTerms,
    loading,
    error,
    fieldErrors,
    setFieldErrors,
    handleSubmit,
    isFormValid,
  };
}
