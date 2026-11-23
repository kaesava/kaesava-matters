"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth";
import { PublicHeader } from "../../../components/public/PublicHeader";
import { PublicFooter } from "../../../components/public/PublicFooter";
import { InviteAuthCard } from "./components/InviteAuthCard";
import { InviteStatusCard } from "./components/InviteStatusCard";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasTriggeredRef = useRef(false);

  const { data: session, isPending, refetch: refetchSession } = authClient.useSession();
  const inviteQuery = trpc.getInviteDetails.useQuery(
    { inviteToken: token },
    { enabled: Boolean(token) && !isPending && !session?.user, retry: false }
  );

  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: (data) => {
      if (data?.tenantId) {
        localStorage.setItem("money_matters_active_tenant_id", data.tenantId);
        const isSecure = window.location.protocol === "https:";
        document.cookie = `active_tenant_id=${data.tenantId}; path=/; max-age=31536000; SameSite=Lax${isSecure ? "; Secure" : ""}`;
      }
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    },
    onError: (err: { message: string }) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    if (isPending || !session?.user || !token || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    acceptInviteMutation.mutate({ inviteToken: token });
  }, [token, acceptInviteMutation, session, isPending]);

  const handleAuthenticated = async () => {
    await refetchSession();
    hasTriggeredRef.current = true;
    setStatus("loading");
    acceptInviteMutation.mutate({ inviteToken: token });
  };

  const handleSignedOut = async () => {
    hasTriggeredRef.current = false;
    setStatus("loading");
    setErrorMsg("");
    await refetchSession();
    await inviteQuery.refetch();
  };

  const renderCardContent = () => {
    if (isPending) return <InviteStatusCard variant="loading" token={token} />;
    if (session?.user) {
      if (status === "success") return <InviteStatusCard variant="success" token={token} />;
      if (status === "error") {
        return (
          <InviteStatusCard
            variant="error"
            token={token}
            errorMsg={errorMsg}
            activeEmail={session.user.email}
            onSignedOut={handleSignedOut}
          />
        );
      }
      return <InviteStatusCard variant="loading" token={token} />;
    }
    if (inviteQuery.isLoading || !inviteQuery.data) return <InviteStatusCard variant="loading" token={token} />;
    const details = inviteQuery.data;
    if (details.status === "EXPIRED") return <InviteStatusCard variant="expired" token={token} />;
    if (details.status === "ALREADY_ACCEPTED") return <InviteStatusCard variant="already_accepted" token={token} />;
    if (details.status !== "VALID" || details.emailMismatch || !details.inviteEmail) {
      return <InviteStatusCard variant="invalid" token={token} />;
    }

    return (
      <InviteAuthCard
        token={token}
        inviteEmail={details.inviteEmail}
        householdName={details.householdName ?? ""}
        accountStatus={details.accountStatus ?? "NEW"}
        onAuthenticated={handleAuthenticated}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader showSignIn={!session?.user} />
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-xl border border-slate-200/80 text-center flex flex-col gap-5">
          {renderCardContent()}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
