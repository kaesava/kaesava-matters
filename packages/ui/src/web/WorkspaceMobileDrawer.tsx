"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { t } from "@kaesava/i18n";
import type { WorkspaceNavItem } from "./WorkspaceDesktopSidebar";

export interface WorkspaceMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  brand?: React.ReactNode;
  headerSlot?: React.ReactNode;
  navItems: readonly WorkspaceNavItem[];
  renderLink?: (item: WorkspaceNavItem, className: string, children: React.ReactNode) => React.ReactNode;
  footerSlot?: React.ReactNode;
  closeAriaLabel?: string;
}

export function WorkspaceMobileDrawer({
  open,
  onClose,
  brand,
  headerSlot,
  navItems,
  renderLink,
  footerSlot,
  closeAriaLabel,
}: WorkspaceMobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-10 flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-xl">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="min-w-0">{brand}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeAriaLabel ?? t("common.close")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {headerSlot && <div className="px-4 py-3 border-b border-slate-100">{headerSlot}</div>}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const cls = `w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              item.active ? "bg-[#2563eb]/10 text-[#2563eb] font-semibold" : "text-[#1B2B4B] hover:bg-slate-50 font-medium"
            }`;
            const body = (
              <>
                <span className="flex items-center gap-2.5 min-w-0">
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700">
                    {item.badge}
                  </span>
                )}
              </>
            );
            if (renderLink && item.href) return <React.Fragment key={item.id}>{renderLink(item, cls, body)}</React.Fragment>;
            const handlePress = () => { item.onClick?.(); onClose(); };
            return item.href ? (
              <a key={item.id} href={item.href} onClick={handlePress} className={cls}>{body}</a>
            ) : (
              <button key={item.id} type="button" onClick={handlePress} className={cls}>{body}</button>
            );
          })}
        </nav>
        {footerSlot && <div className="p-4 border-t border-slate-100">{footerSlot}</div>}
      </aside>
    </div>
  );
}
