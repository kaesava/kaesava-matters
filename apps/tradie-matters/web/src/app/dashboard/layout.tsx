"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  Receipt,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import { t } from "@kaesava/i18n";
import {
  Button,
  Logo,
  Spinner,
  WorkspaceDesktopSidebar,
  WorkspaceMobileDrawer,
  WorkspaceMobileHeader,
  type WorkspaceNavItem,
} from "@kaesava/ui/web";
import { TenantSwitcher } from "@kaesava/capability-tenant/web";
import { authClient } from "../../lib/auth";
import { TRADIE_ACTIVE_TENANT_KEY, trpc } from "../../lib/trpc";
import { getWebVersionInfo } from "../../lib/version";
import "../../i18n";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const tenantStatus = trpc.getTenantStatus.useQuery(undefined, { enabled: !!session?.user, retry: false });
  const subStatus = trpc.getSubscriptionStatus.useQuery(undefined, { enabled: !!session?.user && !!tenantStatus.data?.hasTenant });
  const tenantsQuery = trpc.listUserTenants.useQuery(undefined, { enabled: !!session?.user });

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in");
    if (tenantStatus.data && !tenantStatus.data.hasTenant) router.replace("/complete-profile");
    if (tenantStatus.data?.hasTenant && !tenantStatus.data.setupCompleted) router.replace("/setup");
    if (subStatus.data?.isTrialExpired) router.replace("/subscription/expired");
  }, [isPending, session?.user, tenantStatus.data, subStatus.data, router]);

  if (isPending || tenantStatus.isLoading) {
    return <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  const navItems: WorkspaceNavItem[] = [
    { id: "overview", href: "/dashboard", label: t("tradieWeb.navOverview"), icon: <LayoutDashboard className="w-4 h-4" />, active: pathname === "/dashboard" },
    { id: "schedule", href: "/dashboard/schedule", label: t("tradieWeb.navSchedule"), icon: <CalendarDays className="w-4 h-4" />, active: pathname.startsWith("/dashboard/schedule") },
    { id: "jobs", href: "/dashboard/jobs", label: t("tradieJobs.jobsTitle"), icon: <Briefcase className="w-4 h-4" />, active: pathname.startsWith("/dashboard/jobs") },
    { id: "quotes", href: "/dashboard/quotes", label: t("tradieQuotes.title"), icon: <FileText className="w-4 h-4" />, active: pathname.startsWith("/dashboard/quotes") },
    { id: "invoices", href: "/dashboard/invoices", label: t("tradieInvoices.title"), icon: <Receipt className="w-4 h-4" />, active: pathname.startsWith("/dashboard/invoices") },
    { id: "customers", href: "/dashboard/customers", label: t("tradieWeb.navCustomersSites"), icon: <Users className="w-4 h-4" />, active: pathname.startsWith("/dashboard/customers") },
    { id: "pricebook", href: "/dashboard/pricebook", label: t("tradieCrm.pricebookTitle"), icon: <BookOpen className="w-4 h-4" />, active: pathname.startsWith("/dashboard/pricebook") },
    { id: "suppliers", href: "/dashboard/suppliers", label: t("tradieWeb.navSuppliers"), icon: <Truck className="w-4 h-4" />, active: pathname.startsWith("/dashboard/suppliers") },
    { id: "inbox", href: "/dashboard/inbox", label: t("tradieWeb.navInbox"), icon: <Inbox className="w-4 h-4" />, active: pathname.startsWith("/dashboard/inbox") },
    { id: "timesheets", href: "/dashboard/timesheets", label: t("tradiePulse.timesheets"), icon: <Clock className="w-4 h-4" />, active: pathname.startsWith("/dashboard/timesheets") },
    { id: "activity", href: "/dashboard/activity", label: t("tradieWeb.navActivity"), icon: <Activity className="w-4 h-4" />, active: pathname.startsWith("/dashboard/activity") },
    { id: "settings", href: "/dashboard/settings", label: t("tradieWeb.navSettings"), icon: <Settings className="w-4 h-4" />, active: pathname.startsWith("/dashboard/settings") },
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  const tenants = (tenantsQuery.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const showUrgentBanner = !subStatus.data?.isSubscribed && subStatus.data?.isTrialActive && (subStatus.data.daysRemainingInTrial ?? 14) <= 7;
  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <Logo size="sm" brandName={t("tradieWeb.appName")} src="/tradie-matters-icon.svg" />
      <span className="font-extrabold text-base text-[#1B2B4B]">{t("tradieWeb.appName")}</span>
    </Link>
  );
  const switcher = tenants.length > 1 && tenantStatus.data?.tenantId ? (
    <TenantSwitcher tenants={tenants} activeTenantId={tenantStatus.data.tenantId} onSwitchTenant={(id) => { localStorage.setItem(TRADIE_ACTIVE_TENANT_KEY, id); window.location.reload(); }} />
  ) : undefined;
  const renderLink = (item: WorkspaceNavItem, cls: string, content: React.ReactNode) => (
    <Link key={item.id} href={item.href ?? "/dashboard"} onClick={() => setMobileMenuOpen(false)} className={cls}>{content}</Link>
  );
  const footerSlot = (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>{t("settings.signOut")}</Button>
      <p className="text-center text-[11px] text-slate-400">{getWebVersionInfo().formattedVersion}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] flex flex-col md:flex-row">
      <WorkspaceDesktopSidebar brand={brand} headerSlot={switcher} navItems={navItems} renderLink={renderLink} footerSlot={footerSlot} />
      <div className="flex-1 flex flex-col min-w-0">
        {showUrgentBanner && (
          <div className="w-full py-2 px-4 bg-amber-600 text-white flex items-center justify-between text-xs font-semibold">
            <span>{t("subscription.bannerUrgent", { days: String(subStatus.data?.daysRemainingInTrial ?? 0) })}</span>
            <Link href="/subscription/upgrade" className="bg-white text-slate-900 px-3 py-1 rounded-md font-bold">{t("subscription.upgradeCta")}</Link>
          </div>
        )}
        <WorkspaceMobileHeader brand={brand} onOpenMenu={() => setMobileMenuOpen(true)} menuAriaLabel={t("tradieWeb.menuLabel")} />
        <WorkspaceMobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} brand={brand} headerSlot={switcher} navItems={navItems} renderLink={renderLink} footerSlot={footerSlot} />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
