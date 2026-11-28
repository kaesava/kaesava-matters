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
  CommandPaletteModal,
  Logo,
  Spinner,
  useToast,
  WorkspaceDesktopSidebar,
  WorkspaceMobileDrawer,
  WorkspaceMobileHeader,
  type WorkspaceNavItem,
} from "@kaesava/ui/web";
import { TrialBanner } from "@kaesava/capability-billing/web";
import { FeedbackModal, SettingsVersionFooter } from "@kaesava/capability-bug-reports/web";
import { TenantSwitcher } from "@kaesava/capability-tenant/web";
import { authClient } from "../../lib/auth";
import { TRADIE_ACTIVE_TENANT_KEY, trpc } from "../../lib/trpc";
import { getWebVersionInfo } from "../../lib/version";
import "../../i18n";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { success } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const tenantStatus = trpc.getTenantStatus.useQuery(undefined, { enabled: !!session?.user, retry: false });
  const hasTenant = !!session?.user && !!tenantStatus.data?.hasTenant;
  const subStatus = trpc.getSubscriptionStatus.useQuery(undefined, { enabled: hasTenant });
  const tenantsQuery = trpc.listUserTenants.useQuery(undefined, { enabled: !!session?.user });

  const customersQuery = trpc.customers.list.useQuery({ limit: 50 }, { enabled: hasTenant && cmdPaletteOpen });
  const sitesQuery = trpc.sites.list.useQuery({ limit: 50 }, { enabled: hasTenant && cmdPaletteOpen });
  const jobsQuery = trpc.jobs.list.useQuery({}, { enabled: hasTenant && cmdPaletteOpen });
  const quotesQuery = trpc.quotes.list.useQuery({}, { enabled: hasTenant && cmdPaletteOpen });
  const invoicesQuery = trpc.invoices.list.useQuery({}, { enabled: hasTenant && cmdPaletteOpen });
  const pricebookQuery = trpc.pricebook.fuzzySearch.useQuery({ query: "", limit: 50 }, { enabled: hasTenant && cmdPaletteOpen });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in");
    if (tenantStatus.data && !tenantStatus.data.hasTenant) router.replace("/complete-profile");
    if (tenantStatus.data?.hasTenant && !tenantStatus.data.setupCompleted) router.replace("/setup");
    if (subStatus.data?.isTrialExpired) router.replace("/subscription/expired");
  }, [isPending, session?.user, tenantStatus.data, subStatus.data, router]);

  if (isPending || tenantStatus.isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  const role = (tenantStatus.data?.role ?? "OWNER").toUpperCase();
  const isBookkeeper = role === "BOOKKEEPER";
  const isTradie = role === "TRADIE";

  const allNavItems: Array<WorkspaceNavItem & { visible: boolean }> = [
    { id: "overview", href: "/dashboard", label: t("tradieWeb.navOverview"), icon: <LayoutDashboard className="w-4 h-4" />, active: pathname === "/dashboard", visible: true },
    { id: "schedule", href: "/dashboard/schedule", label: t("tradieWeb.navSchedule"), icon: <CalendarDays className="w-4 h-4" />, active: pathname.startsWith("/dashboard/schedule"), visible: !isBookkeeper },
    { id: "jobs", href: "/dashboard/jobs", label: t("tradieJobs.jobsTitle"), icon: <Briefcase className="w-4 h-4" />, active: pathname.startsWith("/dashboard/jobs"), visible: !isBookkeeper },
    { id: "quotes", href: "/dashboard/quotes", label: t("tradieQuotes.title"), icon: <FileText className="w-4 h-4" />, active: pathname.startsWith("/dashboard/quotes"), visible: !isBookkeeper && !isTradie },
    { id: "invoices", href: "/dashboard/invoices", label: t("tradieInvoices.title"), icon: <Receipt className="w-4 h-4" />, active: pathname.startsWith("/dashboard/invoices"), visible: !isTradie },
    { id: "customers", href: "/dashboard/customers", label: t("tradieWeb.navCustomersSites"), icon: <Users className="w-4 h-4" />, active: pathname.startsWith("/dashboard/customers"), visible: !isBookkeeper },
    { id: "pricebook", href: "/dashboard/pricebook", label: t("tradieCrm.pricebookTitle"), icon: <BookOpen className="w-4 h-4" />, active: pathname.startsWith("/dashboard/pricebook"), visible: !isBookkeeper && !isTradie },
    { id: "suppliers", href: "/dashboard/suppliers", label: t("tradieWeb.navSuppliers"), icon: <Truck className="w-4 h-4" />, active: pathname.startsWith("/dashboard/suppliers"), visible: !isTradie },
    { id: "inbox", href: "/dashboard/inbox", label: t("tradieWeb.navInbox"), icon: <Inbox className="w-4 h-4" />, active: pathname.startsWith("/dashboard/inbox"), visible: !isBookkeeper },
    { id: "timesheets", href: "/dashboard/timesheets", label: t("tradiePulse.timesheets"), icon: <Clock className="w-4 h-4" />, active: pathname.startsWith("/dashboard/timesheets"), visible: true },
    { id: "activity", href: "/dashboard/activity", label: t("tradieWeb.navActivity"), icon: <Activity className="w-4 h-4" />, active: pathname.startsWith("/dashboard/activity"), visible: !isTradie },
    { id: "settings", href: "/dashboard/settings", label: t("tradieWeb.navSettings"), icon: <Settings className="w-4 h-4" />, active: pathname.startsWith("/dashboard/settings"), visible: true },
  ];
  const navItems: WorkspaceNavItem[] = allNavItems.filter((item) => item.visible);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  const tenants = (tenantsQuery.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const versionInfo = getWebVersionInfo();
  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <Logo size="sm" brandName={t("tradieWeb.appName")} src="/tradie-matters-icon.svg" />
      <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{t("tradieWeb.appName")}</span>
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
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setFeedbackOpen(true)}>{t("feedback.reportIssue")}</Button>
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>{t("settings.signOut")}</Button>
      <SettingsVersionFooter
        appName={t("tradieWeb.appName")}
        formattedVersion={versionInfo.formattedVersion}
        onCopyDiagnostics={() => {
          navigator.clipboard?.writeText(JSON.stringify({ app: "tradie-matters", version: versionInfo.formattedVersion, role, tenantId: tenantStatus.data?.tenantId }, null, 2));
          success(t("settings.diagnosticsCopied"));
        }}
      />
    </div>
  );

  const palettePages = [
    ...navItems.map((n) => ({ id: `nav-${n.id}`, title: n.label, route: n.href ?? "/dashboard", keywords: [n.id, n.label] })),
    ...(customersQuery.data ?? []).map((c) => ({ id: `cust-${c.id}`, title: `${c.name} (${t("tradieCrm.customers")})`, route: `/dashboard/customers?customerId=${c.id}`, keywords: [c.name, c.email ?? "", c.phone ?? ""] })),
    ...(sitesQuery.data ?? []).map((s) => ({ id: `site-${s.id}`, title: `${s.addressLine1} (${t("tradieCrm.sites")})`, route: `/dashboard/customers?siteId=${s.id}`, keywords: [s.addressLine1, s.suburb ?? ""] })),
    ...(jobsQuery.data ?? []).map((j) => ({ id: `job-${j.id}`, title: `${j.jobNumber} · ${j.title}`, route: `/dashboard/jobs/${j.id}`, keywords: [j.jobNumber, j.title] })),
    ...(quotesQuery.data ?? []).map((q) => ({ id: `quote-${q.id}`, title: `${q.quoteNumber} · ${q.title}`, route: `/dashboard/quotes/${q.id}`, keywords: [q.quoteNumber, q.title] })),
    ...(invoicesQuery.data ?? []).map((inv) => ({ id: `inv-${inv.id}`, title: `${inv.invoiceNumber} (${t("tradieInvoices.title")})`, route: `/dashboard/invoices/${inv.id}`, keywords: [inv.invoiceNumber] })),
    ...(pricebookQuery.data ?? []).map((pb) => ({ id: `pb-${pb.id}`, title: `${pb.name} (${t("tradieCrm.pricebookTitle")})`, route: `/dashboard/pricebook`, keywords: [pb.name, pb.sku ?? ""] })),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      <WorkspaceDesktopSidebar brand={brand} headerSlot={switcher} navItems={navItems} renderLink={renderLink} footerSlot={footerSlot} />
      <div className="flex-1 flex flex-col min-w-0">
        <TrialBanner status={subStatus.data ? { ...subStatus.data, trialEndsAt: subStatus.data.trialEndsAt ? new Date(subStatus.data.trialEndsAt) : null, subscriptionEndsAt: subStatus.data.subscriptionEndsAt ? new Date(subStatus.data.subscriptionEndsAt) : null, nextBillingAt: subStatus.data.nextBillingAt ? new Date(subStatus.data.nextBillingAt) : null, gracePeriodEndsAt: subStatus.data.gracePeriodEndsAt ? new Date(subStatus.data.gracePeriodEndsAt) : null } : undefined} isLoading={subStatus.isLoading} onUpgrade={() => router.push("/subscription/upgrade")} />
        <WorkspaceMobileHeader brand={brand} onOpenMenu={() => setMobileMenuOpen(true)} menuAriaLabel={t("tradieWeb.menuLabel")} />
        <WorkspaceMobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} brand={brand} headerSlot={switcher} navItems={navItems} renderLink={renderLink} footerSlot={footerSlot} />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      </div>
      <CommandPaletteModal
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        pages={palettePages}
        onSelectPage={(page) => { setCmdPaletteOpen(false); router.push(page.route); }}
      />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        userEmail={session?.user?.email ?? ""}
        isSubmitting={false}
        onSubmit={async () => {
          success(t("feedback.submitted"));
          setFeedbackOpen(false);
        }}
      />
    </div>
  );
}
