"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InviteAcceptFlow } from "@kaesava/capability-tenant/web";
import { Spinner } from "@kaesava/ui/web";
import { authClient } from "../../../lib/auth";
import { TRADIE_ACTIVE_TENANT_KEY, trpc } from "../../../lib/trpc";
import { TradiePublicHeader } from "../../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../../components/TradiePublicFooter";
import "../../../i18n";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";
  const [accepted, setAccepted] = useState(false);
  const hasTriggeredRef = useRef(false);

  const { data: session, isPending, refetch: refetchSession } = authClient.useSession();
  const inviteQuery = trpc.getInviteDetails.useQuery(
    { inviteToken: token },
    { enabled: Boolean(token) && !isPending, retry: false }
  );

  const acceptInvite = trpc.acceptInvite.useMutation({
    onSuccess: (data) => {
      if (data?.tenantId && typeof window !== "undefined") {
        localStorage.setItem(TRADIE_ACTIVE_TENANT_KEY, data.tenantId);
      }
      setAccepted(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    },
  });

  useEffect(() => {
    if (isPending || !session?.user || !token || hasTriggeredRef.current) return;
    if (inviteQuery.data?.status === "VALID" && !inviteQuery.data.emailMismatch) {
      hasTriggeredRef.current = true;
      acceptInvite.mutate({ inviteToken: token });
    }
  }, [isPending, session?.user, token, inviteQuery.data, acceptInvite]);

  const handleSignOut = async () => {
    await authClient.signOut();
    hasTriggeredRef.current = false;
    await refetchSession();
    await inviteQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between">
      <TradiePublicHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {isPending || inviteQuery.isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <InviteAcceptFlow
              inviteDetails={inviteQuery.data ?? { status: "INVALID" }}
              isLoading={accepted || acceptInvite.isPending}
              isAccepting={acceptInvite.isPending}
              onAccept={async () => {
                if (session?.user) {
                  await acceptInvite.mutateAsync({ inviteToken: token });
                } else {
                  router.push(`/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`);
                }
              }}
              onSignOut={handleSignOut}
              onReturnHome={() => router.push("/")}
            />
          )}
        </div>
      </main>
      <TradiePublicFooter />
    </div>
  );
}
