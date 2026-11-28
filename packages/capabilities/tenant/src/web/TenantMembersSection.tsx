"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import type { TenantMembersProps } from "../ui-contracts.js";

export function TenantMembersSection({
  members,
  currentUserId,
  isOwner,
  roleOptions = [],
  isInviting = false,
  onInvite,
  onUpdateRole,
  onRemoveMember,
}: TenantMembersProps) {
  const [email, setEmail] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState(roleOptions[0]?.key ?? "");
  const emailId = useId();
  const roleId = useId();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || isInviting) return;
    const matched = roleOptions.find((r) => r.key === selectedRoleKey);
    const baseRole = matched?.baseRole === "VIEWER" ? "VIEWER" : "MEMBER";
    await onInvite({ email: email.trim(), role: baseRole, appRole: matched?.key ?? null });
    setEmail("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("settings.members.title")}</h2>
      {members.length === 0 ? (
        <p className="text-sm text-slate-500">{t("settings.members.noMembers")}</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {m.appRole ?? (m.isOwner ? t("settings.members.roleOwner") : t("settings.members.roleMember"))}
                </span>
                {isOwner && onUpdateRole && m.userId !== currentUserId && (
                  <button type="button" onClick={() => onUpdateRole({ memberId: m.id, newRole: m.isOwner ? "MEMBER" : "OWNER" })} className="text-xs text-blue-600 hover:underline">
                    {t("settings.members.roleSelectorLabel")}
                  </button>
                )}
                {isOwner && onRemoveMember && m.userId !== currentUserId && (
                  <button type="button" onClick={() => onRemoveMember(m.id)} className="text-xs text-red-600 hover:underline">
                    {t("settings.members.removeAction")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {isOwner && (
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="min-w-[200px] flex-1">
            <label htmlFor={emailId} className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{t("settings.members.emailAddressLabel")}</label>
            <input id={emailId} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          {roleOptions.length > 0 && (
            <div>
              <label htmlFor={roleId} className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{t("settings.members.roleSelectorLabel")}</label>
              <select id={roleId} value={selectedRoleKey} onChange={(e) => setSelectedRoleKey(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                {roleOptions.map((r) => (<option key={r.key} value={r.key}>{r.label}</option>))}
              </select>
            </div>
          )}
          <button type="submit" disabled={!email.includes("@") || isInviting} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">
            {isInviting ? t("common.loading") : t("settings.members.sendInvitationCta")}
          </button>
        </form>
      )}
    </div>
  );
}
